-- ShineSlot database (Supabase). Paste the whole file into Supabase > SQL Editor > New query > Run.
-- Safe to run again: it only creates what is missing and replaces the functions.
--
-- Who can do what:
--   * A business owner signs in and can read and change only their own business and requests.
--   * Customers never sign in and cannot read the tables. They can only:
--       - read a business's public profile by its link name (get_business)
--       - send a request (submit_request), which gives back a private token
--       - read and accept their own request with that token (get_quote, accept_quote)

create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null unique references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,40}$'),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'new' check (status in ('new','quoted','accepted','done','declined')),
  data jsonb not null,
  quote jsonb,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  check (octet_length(data::text) < 700000)
);
create index if not exists requests_business_idx on public.requests(business_id, created_at desc);

alter table public.businesses enable row level security;
alter table public.requests enable row level security;

drop policy if exists "owner reads own business" on public.businesses;
drop policy if exists "owner creates own business" on public.businesses;
drop policy if exists "owner updates own business" on public.businesses;
create policy "owner reads own business" on public.businesses for select using (owner = auth.uid());
create policy "owner creates own business" on public.businesses for insert with check (owner = auth.uid());
create policy "owner updates own business" on public.businesses for update using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "owner reads own requests" on public.requests;
drop policy if exists "owner updates own requests" on public.requests;
create policy "owner reads own requests" on public.requests for select
  using (business_id in (select id from public.businesses where owner = auth.uid()));
create policy "owner updates own requests" on public.requests for update
  using (business_id in (select id from public.businesses where owner = auth.uid()))
  with check (business_id in (select id from public.businesses where owner = auth.uid()));
-- No insert or delete policy: requests only come in through submit_request.

-- Public profile for the customer form. Only safe fields.
create or replace function public.get_business(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'slug', slug,
    'trade', settings->>'trade', 'business', settings->>'business', 'owner', settings->>'owner',
    'area', settings->>'area', 'intro', settings->>'intro', 'shopAddress', settings->>'shopAddress',
    'hours', settings->'hours',
    -- blocked times without the owner's private notes
    'blocks', (select coalesce(jsonb_agg(b - 'note'), '[]'::jsonb) from jsonb_array_elements(coalesce(settings->'blocks', '[]'::jsonb)) b))
  from businesses where slug = lower(p_slug);
$$;

-- A customer sends a request. Returns the private token for their quote page.
create or replace function public.submit_request(p_slug text, p_data jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare b uuid; t text; recent int;
begin
  select id into b from businesses where slug = lower(p_slug);
  if b is null then raise exception 'Business not found'; end if;
  if coalesce(trim(p_data->>'name'), '') = '' or coalesce(trim(p_data->>'vehicle'), '') = ''
     or (coalesce(trim(p_data->>'phone'), '') = '' and coalesce(trim(p_data->>'email'), '') = '') then
    raise exception 'Missing name, vehicle or contact';
  end if;
  if jsonb_array_length(coalesce(p_data->'photos', '[]'::jsonb)) > 4 then raise exception 'Too many photos'; end if;
  if octet_length(p_data::text) > 650000 then raise exception 'Photos are too large'; end if;
  -- simple flood guard: at most 30 new requests per business per hour
  select count(*) into recent from requests where business_id = b and created_at > now() - interval '1 hour';
  if recent >= 30 then raise exception 'Too many requests right now. Please try again later.'; end if;
  insert into requests (business_id, data, history)
    values (b, p_data, jsonb_build_array(jsonb_build_object('at', now(), 'what', 'Request sent')))
    returning token into t;
  return t;
end $$;

-- A customer reads their own request.
create or replace function public.get_quote(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('status', r.status, 'data', r.data - 'photos', 'quote', r.quote,
    'business', public.get_business(b.slug))
  from requests r join businesses b on b.id = r.business_id where r.token = p_token;
$$;

-- A customer accepts the price they were sent.
create or replace function public.accept_quote(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update requests set status = 'accepted',
    history = history || jsonb_build_array(jsonb_build_object('at', now(), 'what', 'Customer accepted'))
  where token = p_token and status = 'quoted' and quote is not null;
  if not found then raise exception 'This quote can no longer be accepted.'; end if;
end $$;

revoke all on function public.get_business(text), public.submit_request(text, jsonb), public.get_quote(text), public.accept_quote(text) from public;
grant execute on function public.get_business(text), public.submit_request(text, jsonb), public.get_quote(text), public.accept_quote(text) to anon, authenticated;

-- ---------- Phone alerts (added 2026-10-31) ----------
-- When a request comes in, send a short alert through ntfy.sh (free phone app, no account) to the
-- owner's private topic, saved in businesses.settings.ntfyTopic. The alert names only the car and
-- the job, never the customer's name, phone, email or address. A failed alert never blocks a request.
create extension if not exists pg_net;

create or replace function public.notify_new_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare topic text; jobs text;
begin
  select settings->>'ntfyTopic' into topic from businesses where id = new.business_id;
  if topic is null or topic !~ '^[A-Za-z0-9_-]{16,64}$' then return new; end if;
  select string_agg(x, ', ') into jobs from jsonb_array_elements_text(coalesce(new.data->'services', '[]'::jsonb)) as x;
  perform net.http_post(
    url := 'https://ntfy.sh/',
    body := jsonb_build_object(
      'topic', topic,
      'title', 'New ShineSlot request',
      'message', left(coalesce(nullif(new.data->>'vehicle', ''), 'A car') || coalesce(' · ' || jobs, ''), 200),
      'click', 'https://brianbadical.github.io/shineslot/#inbox',
      'tags', jsonb_build_array('car')),
    headers := '{"Content-Type": "application/json"}'::jsonb);
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists requests_notify on public.requests;
create trigger requests_notify after insert on public.requests
  for each row execute function public.notify_new_request();
revoke all on function public.notify_new_request() from public, anon, authenticated;
