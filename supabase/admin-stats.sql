-- Brian's ShineSlot stats page (#admin), 2026-11-04. Run once in Supabase > SQL Editor.
-- Returns COUNTS and totals per business only: no customer names, phones, addresses or photos.
-- Only accounts listed in app_admins get an answer. The table has no policies, so nobody can read or
-- change it through the API; add an admin only here in the SQL Editor.
-- Undo: drop function public.admin_stats(); drop table public.app_admins;

create table if not exists public.app_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;

create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.app_admins where user_id = auth.uid()) then
    raise exception 'not allowed';
  end if;
  return (select coalesce(jsonb_agg(x order by x->>'joined'), '[]'::jsonb) from (
    select jsonb_build_object(
      'slug', b.slug,
      'business', b.settings->>'business',
      'owner', b.settings->>'owner',
      'trade', b.settings->>'trade',
      'joined', b.created_at,
      'last_sign_in', u.last_sign_in_at,
      'has_prices', coalesce(jsonb_array_length(case when jsonb_typeof(b.settings->'sizes') = 'array' then b.settings->'sizes' end), 0) > 0,
      'has_hours', b.settings ? 'hours',
      'pay_on', coalesce((b.settings->'pay'->>'on') = 'true', false),
      'requests_7d', count(r.id) filter (where r.created_at > now() - interval '7 days'),
      'requests_30d', count(r.id) filter (where r.created_at > now() - interval '30 days'),
      'total', count(r.id),
      'waiting', count(r.id) filter (where r.status = 'new'),
      'quoted', count(r.id) filter (where r.status in ('quoted', 'accepted', 'done')),
      'booked', count(r.id) filter (where r.status in ('accepted', 'done')),
      'done', count(r.id) filter (where r.status = 'done'),
      'booked_value', coalesce(sum((r.quote->>'price')::numeric) filter (where r.status in ('accepted', 'done') and (r.quote->>'price') ~ '^[0-9.]+$'), 0),
      'paid_total', coalesce(sum(coalesce((r.data->'paid'->>'amount')::numeric, 0) + coalesce((r.data->'paid'->>'tip')::numeric, 0)) filter (where (r.data->'paid'->>'amount') ~ '^[0-9.]+$' and coalesce(r.data->'paid'->>'tip', '0') ~ '^[0-9.]+$'), 0),
      'ratings', count(r.id) filter (where r.rating is not null),
      'avg_stars', round(avg((r.rating->>'stars')::numeric) filter (where (r.rating->>'stars') ~ '^[1-5]$'), 1),
      'last_request_at', max(r.created_at)
    ) x
    from public.businesses b
    left join auth.users u on u.id = b.owner
    left join public.requests r on r.business_id = b.id
    group by b.id, u.last_sign_in_at
  ) t);
end $$;
revoke all on function public.admin_stats() from public;
grant execute on function public.admin_stats() to authenticated;

-- Brian is the admin: the account that owns the 'thangs' test business.
insert into public.app_admins (user_id) select owner from public.businesses where slug = 'thangs' on conflict do nothing;
