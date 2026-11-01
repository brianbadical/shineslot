import {
  TRADES, tradeOf, MAX_PHOTOS, STATUS_LABEL, makeRequest, validateRequest, applyQuote, applyAccept,
  applyDone, applyDecline, inboxOrder, WEEKDAYS, WEEKDAY_NAMES, hoursOf, validateBlock, blocksOn, isOpenDay, openDays, clashes, prettyTime, prettyDay, detailLines, parseSizes, sizesText, sizePrice, servicesOf, parseChoices, tradeFor, parseQuestions, validatePay, payLinks, applyPaid, applyUnpaid, earnings, PAY_METHODS, splitBookLink, RATING_GOOD, RATING_BAD, canRate, validateRating, ratingSummary, starsText, REPEAT_CHOICES, repeatLabel, dueForRebook, againFields, jobsForDay, dayTotal, weekOf, shiftDay, money, prettyWhen, localDay, mapsLink,
} from './logic.js?v=202611010359';
import { LocalStore, newId } from './store.js?v=202611010359';
import { CloudStore, slugify } from './cloud.js?v=202611010359';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js?v=202611010359';
import { sampleRequests } from './sample.js?v=202611010359';
import qrcode from './qr.js?v=202611010359';

// Falls back to memory (lost on reload) if the browser blocks storage.
function safeStorage() {
  try { const s = window.localStorage; s.setItem('shineslot:probe', '1'); s.removeItem('shineslot:probe'); return s; }
  catch { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; }
}
const store = SUPABASE_URL && SUPABASE_KEY ? new CloudStore(SUPABASE_URL, SUPABASE_KEY) : new LocalStore(safeStorage());
const cloud = store.mode === 'cloud';

const $ = s => document.querySelector(s);
const app = $('#app');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nowIso = () => new Date().toISOString();
let viewDay = localDay();
let calMode = 'week';

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400);
}

function baseLink() { return location.href.split('#')[0]; }

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied'); }
  catch { toast('Copy did not work here. Press and hold the link to copy it.'); }
}

// ---------- shell ----------
async function shell(customer, settings) {
  const s = settings || await store.getSettings();
  const t = tradeOf(s.trade);
  $('#top').innerHTML = `<div class="biz">${esc(s.business || t.defaultBusiness)}</div><div class="sub">${customer ? esc(s.area || t.tagline) : 'ShineSlot · your work desk'}</div>`;
  $('#tabs').hidden = customer;
  document.body.style.paddingBottom = customer ? '24px' : '';
  const demo = $('#demo');
  if (store.mode === 'demo') {
    demo.hidden = false;
    demo.innerHTML = customer
      ? `Demo: you're seeing what a customer sees. <button data-go="inbox">Switch to the business side</button>`
      : `Demo: everything is saved on this device only. <button data-go="request">See the customer form</button>`;
  } else demo.hidden = true;
  // On customer pages, a small line invites other business owners to get their own free link.
  let foot = document.getElementById('madewith');
  if (!foot) { foot = document.createElement('p'); foot.id = 'madewith'; foot.className = 'madewith'; app.after(foot); }
  foot.hidden = !customer;
  foot.innerHTML = `Run a service business? <a href="${esc(baseLink())}#inbox">Get your own free booking link</a>`;
  if (customer) return;
  if (cloud && (await store.businesses()).length > 1)
    $('#top .sub').innerHTML = `ShineSlot · <a href="#settings">switch business</a>`;
  const reqs = await store.listRequests();
  const fresh = reqs.filter(r => r.status === 'new').length;
  document.querySelectorAll('.tabs a').forEach(a => {
    a.classList.toggle('on', a.dataset.tab === currentTab());
    a.querySelector('.dot')?.remove();
    if (a.dataset.tab === 'inbox' && fresh) a.insertAdjacentHTML('beforeend', `<span class="dot">${fresh}</span>`);
  });
}

function currentTab() { return (location.hash.slice(1) || 'inbox').split('-')[0]; }

// ---------- customer: request form ----------
let draftPhotos = [];

async function viewRequest(slug, ref = '') {
  const s = await store.publicBusiness(slug);
  if (!s) { await shell(true, {}); app.innerHTML = `<div class="card empty">This booking link doesn't work. Ask for a new one.</div>`; return; }
  await shell(true, s);
  const t = tradeFor(s);
  draftPhotos = [];
  app.innerHTML = `
  <h1>Request a quote</h1>
  <p class="lead">${esc(s.intro || t.intro)}</p>
  ${pkgHtml(s)}
  <form id="rq" class="card" novalidate>
    <label for="name">Your name</label><input id="name" name="name" autocomplete="name">
    <div class="row">
      <div><label for="phone">Phone</label><input id="phone" name="phone" type="tel" autocomplete="tel"></div>
      <div><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email"></div>
    </div>
    ${(s.sizes || []).length ? `<label>${esc(t.sizesLabel || 'Size')}</label><div class="chips sizes">${s.sizes.map((z, i) =>
      `<label class="chip"><input type="radio" name="size" value="${i}"><span>${esc(z.label)} <b>${esc(sizePrice(z))}</b></span></label>`).join('')}<label class="chip"><input type="radio" name="size" value="other"><span>Something else</span></label></div>
      <p class="meta">Starting prices. Your final price depends on the job.</p>` : ''}
    ${t.composeItem ? '' : `<label for="vehicle">${esc(t.itemLabel)}</label><input id="vehicle" name="vehicle" placeholder="${esc(t.itemHint)}">`}
    ${t.questions ? questionsHtml(t, 0) : ''}
    <label>${esc(t.servicesLabel)}</label>
    <div class="chips">${servicesOf(s).map(x => `<label class="chip"><input type="checkbox" name="services" value="${esc(x)}"><span>${esc(x)}</span></label>`).join('')}</div>
    <label>${esc(t.photosLabel)} (optional, up to ${MAX_PHOTOS})</label>
    <div class="photos" id="ph"></div>
    ${(t.questions || []).some(q => q.key === 'often') ? '' : `<label>How often?</label><div class="chips">${REPEAT_CHOICES.map(([v, l], i) =>
      `<label class="chip"><input type="radio" name="repeat" value="${v}"${i ? '' : ' checked'}><span>${l}</span></label>`).join('')}</div>`}
    <label>When are you free? (pick any)</label>
    ${(() => { const days = openDays(s, localDay(), 14); return days.length
      ? `<div class="chips">${days.map(d => `<label class="chip"><input type="checkbox" name="times" value="${esc(prettyDay(d))}"><span>${esc(prettyDay(d))}</span></label>`).join('')}</div>`
      : `<p class="meta">No open days in the next two weeks. Send your request anyway and we'll find a time.</p>`; })()}
    <div class="chips" style="margin-top:8px">${['Morning', 'Afternoon', 'Evening'].map(x => `<label class="chip"><input type="checkbox" name="times" value="${x}"><span>${x}</span></label>`).join('')}</div>
    ${t.atShop ? '' : `<label for="address">${esc(t.addressLabel)}</label><input id="address" name="address" placeholder="Street address or area" autocomplete="street-address">`}
    ${t.questions ? questionsHtml(t, 1) : ''}
    <label for="notes">${esc(t.notesLabel)}</label><textarea id="notes" name="notes" placeholder="${esc(t.questions ? 'Anything we missed?' : t.notesHint)}"></textarea>
    <div class="errors" id="err"></div>
    <button class="btn block" type="submit">Send request</button>
  </form>`;
  drawPhotos();
  ref = fillAgain(slug) || ref;
  $('#rq').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const input = {
      name: f.get('name'), phone: f.get('phone'), email: f.get('email'), vehicle: f.get('vehicle'),
      services: f.getAll('services'), times: f.getAll('times'), address: f.get('address') || '', notes: f.get('notes'),
      photos: draftPhotos, ref, repeat: f.get('repeat') || '',
      size: f.get('size') != null && f.get('size') !== 'other' ? s.sizes[+f.get('size')] : null,
      sizeOther: f.get('size') === 'other',
      details: Object.fromEntries((t.questions || []).filter(q => q.key).map(q => [q.key, q.type === 'multi' ? f.getAll('d_' + q.key) : f.get('d_' + q.key)])),
    };
    const errors = validateRequest(input, t);
    if ((s.sizes || []).length && !input.size && !input.sizeOther) errors.unshift(`Pick your ${(t.sizesLabel || 'size').toLowerCase()}.`);
    if (errors.length) { $('#err').innerHTML = errors.map(esc).join('<br>'); $('#err').scrollIntoView({ block: 'center' }); return; }
    try {
      const req = makeRequest(input, { id: newId(), now: nowIso(), trade: t });
      e.target.querySelector('button[type=submit]').disabled = true;
      const token = await store.submitRequest(slug, req);
      location.hash = 'q-' + token;
    } catch (err) { $('#err').textContent = err.message; e.target.querySelector('button[type=submit]').disabled = false; }
  });
}

// "Book again": fill the form with what the customer sent last time. Returns who sent them, if anyone.
const AGAIN = 'shineslot:again';
function fillAgain(slug) {
  let a = null; try { a = JSON.parse(sessionStorage.getItem(AGAIN) || 'null'); sessionStorage.removeItem(AGAIN); } catch {}
  if (!a || a.slug !== slug) return '';
  const f = $('#rq'), v = a.fields || {};
  const set = (name, val) => {
    const els = f.querySelectorAll(`[name="${name}"]`);
    els.forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = (Array.isArray(val) ? val : [val]).includes(el.value);
      else el.value = val ?? '';
    });
  };
  for (const k of ['name', 'phone', 'email', 'vehicle', 'address']) if (v[k]) set(k, v[k]);
  if (v.services) set('services', v.services);
  if (v.repeat) set('repeat', v.repeat);
  for (const [k, val] of Object.entries(v.details || {})) set('d_' + k, val);
  f.insertAdjacentHTML('afterbegin', `<p class="welcome">👋 Welcome back${v.name ? ', ' + esc(String(v.name).split(' ')[0]) : ''}! We filled in your details from last time. Just pick a day.</p>`);
  return v.ref || '';
}

// The owner's main service, shown at the top of the customer form.
// Lines ending in ":" become small headings (for example "Interior:").
function pkgHtml(s) {
  const p = s.pkg || {};
  if (!p.name && !p.about) return '';
  const lines = String(p.about || '').split('\n').map(x => x.trim());
  const body = lines.map(x => !x ? '' : x.endsWith(':') ? `<div class="pkg-h">${esc(x.slice(0, -1))}</div>` : `<div>${esc(x)}</div>`).join('');
  const sub = [(s.sizes || []).length ? 'From ' + sizePrice(s.sizes.reduce((a, b) => a.price <= b.price ? a : b)) : 'Price varies', p.time].filter(Boolean).join(' · ');
  return `<div class="card pkg">${p.name ? `<h2>${esc(p.name)}</h2>` : ''}<div class="meta">${esc(sub)}</div>
    <details open><summary>What's included</summary><div class="pkg-body">${body}</div></details></div>`;
}

// Intake questions, split into sections. part 0 = the first section (shown open, has the
// required questions); part 1 = the rest, folded so the form stays short on a phone.
function questionsHtml(t, part) {
  const sections = [];
  if (!t.questions || !t.questions.length) return '';
  for (const q of t.questions) { if (q.section) sections.push({ title: q.section, qs: [] }); else sections.at(-1).qs.push(q); }
  const field = q => {
    const id = 'd_' + q.key, opt = q.required ? '' : ' <span class="opt">(optional)</span>';
    const hint = q.hint && q.type ? `<div class="meta">${esc(q.hint)}</div>` : '';
    if (q.type === 'choice' || q.type === 'multi') return `<label>${esc(q.label)}${opt}</label><div class="chips">${q.options.map(o =>
      `<label class="chip"><input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="${id}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('')}</div>${hint}`;
    if (q.type === 'select') return `<label for="${id}">${esc(q.label)}${opt}</label><select id="${id}" name="${id}"><option value="">Pick one</option>${q.options.map(o => `<option>${esc(o)}</option>`).join('')}</select>`;
    if (q.type === 'date') return `<label for="${id}">${esc(q.label)}${opt}</label><input id="${id}" name="${id}" type="date">`;
    return `<label for="${id}">${esc(q.label)}${opt}</label><input id="${id}" name="${id}" maxlength="300" placeholder="${esc(q.hint || '')}">`;
  };
  const body = qs => { let h = '', i = 0;
    while (i < qs.length) {
      if (qs[i].half && qs[i + 1]?.half) { h += `<div class="row"><div>${field(qs[i])}</div><div>${field(qs[i + 1])}</div></div>`; i += 2; }
      else h += field(qs[i++]);
    } return h; };
  if (!sections.length) return '';
  if (part === 0) return `<h2>${esc(sections[0].title)}</h2>` + body(sections[0].qs);
  if (sections.length < 2) return '';
  return `<h2>A few more questions <span class="opt">(optional, helps us price it right)</span></h2>` +
    sections.slice(1).map(sec => `<details class="more"><summary>${esc(sec.title)}</summary>${body(sec.qs)}</details>`).join('');
}

function detailsHtml(r, t) {
  const lines = detailLines(r.details, t);
  if (!lines.length) return '';
  return `<details class="answers"><summary>Their answers (${lines.length})</summary><dl>${lines.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>`;
}

// Private notes and impressions. Only the owner sees these, never the customer.
function ownerNoteHtml(r) {
  return `<details class="answers"${r.ownerNote ? ' open' : ''}><summary>Your notes (only you see these)</summary>
    <textarea data-onote maxlength="2000" placeholder="Impressions from the call, door code, anything to remember">${esc(r.ownerNote || '')}</textarea>
    <button class="btn ghost small" type="button" data-onote-save>Save notes</button></details>`;
}

function drawPhotos() {
  const box = $('#ph'); if (!box) return;
  box.innerHTML = draftPhotos.map((p, i) => `<div class="rm"><img src="${p}" alt="Photo ${i + 1}"><button type="button" data-rm="${i}" aria-label="Remove photo">✕</button></div>`).join('')
    + (draftPhotos.length < MAX_PHOTOS ? `<label class="addphoto">+ Add<br>photo<input type="file" accept="image/*" multiple id="file"></label>` : '');
  box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { draftPhotos.splice(+b.dataset.rm, 1); drawPhotos(); });
  const file = $('#file');
  if (file) file.onchange = async () => {
    for (const f of [...file.files].slice(0, MAX_PHOTOS - draftPhotos.length)) {
      try { draftPhotos.push(await shrink(f)); } catch { toast('One photo could not be read.'); }
    }
    drawPhotos();
  };
}

// Resize photos to keep them small (about 100 KB each).
function shrink(file, max = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
}

// ---------- customer: quote page ----------
async function viewQuote(token) {
  const found = await store.getQuote(token);
  if (!found) { await shell(true, {}); app.innerHTML = `<div class="card empty">This request was not found. Ask for a new link.</div>`; return; }
  const { request: r, settings: s } = found;
  await shell(true, s);
  let body;
  if (r.status === 'new') body = `<div class="done-note"><div class="big">📨</div><h1>Request sent</h1><p class="lead">${esc(s.owner || s.business || tradeOf(s.trade).defaultBusiness)} will look at it and send you a price and a time. Keep this page; it updates when the price is ready.</p></div>`;
  else if (r.status === 'quoted') body = `
    <h1>Your price is ready</h1>
    <div class="card"><div class="price">${money(r.quote.price)}</div>
      <div class="meta">${esc(prettyWhen(r.quote.when))} · ${esc(r.vehicle)}</div>
      <div class="tags">${r.services.map(x => `<span>${esc(x)}</span>`).join('')}</div>
      ${r.quote.note ? `<p>${esc(r.quote.note)}</p>` : ''}
      <button class="btn block" id="accept">Accept and book</button>
      <p class="meta" style="text-align:center">${s.pay && s.pay.on ? 'After you book you can pay here, or' : 'Pay'} ${esc(s.owner || tradeOf(s.trade).worker)} on the day. Need a different time? Reply to their message.</p></div>`;
  else if (r.status === 'accepted' || r.status === 'done') body = `<div class="done-note"><div class="big">✅</div><h1>${r.status === 'done' ? 'All done. Thanks!' : "You're booked"}</h1><p class="lead">${esc(prettyWhen(r.quote.when))} · ${money(r.quote.price)}<br>${tradeOf(s.trade).atShop ? (s.shopAddress ? 'Bring it to ' + esc(s.shopAddress) : '') : esc(r.address)}</p></div>
    ${r.paid ? receiptHtml(r, s) : payHtml(s, r.quote.price)}
    ${rateHtml(r, s)}
    ${r.status === 'done' || canRate({ ...r, rating: null }, nowWhen()) ? `<button class="btn block" id="again">🔁 Book again</button>` : ''}`;
  else body = `<div class="done-note"><h1>Not available</h1><p class="lead">${esc(s.business || tradeOf(s.trade).defaultBusiness)} can't take this job. Thanks for asking.</p></div>`;
  app.innerHTML = body;
  bindRate(token);
  $('#again')?.addEventListener('click', () => {
    const slug = s.slug || 'demo';
    try { sessionStorage.setItem(AGAIN, JSON.stringify({ slug, fields: againFields(r) })); } catch {}
    location.hash = cloud ? 'book-' + slug : 'request';
  });
  $('#accept')?.addEventListener('click', async () => {
    try { await store.acceptQuote(token, applyAccept); toast('Booked'); render(); }
    catch (e) { toast(e.message); }
  });
}

// Two taps: stars, then a few quick choices. Shown once the job time has passed.
function rateHtml(r, s) {
  const who = esc(s.owner || s.business || tradeOf(s.trade).worker);
  if (r.rating) return `<div class="card rate"><h2 style="margin-top:0">Thanks for your rating</h2><div class="stars-show">${starsText(r.rating.stars)}</div></div>`;
  if (!canRate(r, nowWhen())) return '';
  const chips = (list, cls) => `<div class="chips ${cls}" hidden>${list.map(x => `<label class="chip"><input type="checkbox" name="tags" value="${esc(x)}"><span>${esc(x)}</span></label>`).join('')}</div>`;
  return `<form class="card rate" id="rate" novalidate><h2 style="margin-top:0">How did it go?</h2><p class="meta">Your rating goes to ${who} only.</p>
    <div class="stars" role="radiogroup" aria-label="Stars">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="stars" value="${n}" aria-label="${n} star${n > 1 ? 's' : ''}"><span>★</span></label>`).join('')}</div>
    <p class="meta good-q" hidden>What went well?</p>${chips(RATING_GOOD, 'good')}
    <p class="meta bad-q" hidden>What went wrong?</p>${chips(RATING_BAD, 'bad')}
    <div data-more hidden><label for="rc">Anything else? (optional)</label><textarea id="rc" name="comment" maxlength="500"></textarea>
    <div class="errors" data-err></div><button class="btn block" type="submit">Send rating</button></div></form>`;
}
function nowWhen() { const d = new Date(); return localDay(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function bindRate(token) {
  const f = $('#rate'); if (!f) return;
  const paint = () => {
    const n = +(new FormData(f).get('stars') || 0);
    f.querySelectorAll('.stars label').forEach((l, i) => l.classList.toggle('on', i < n));
    const good = n >= 4;
    f.querySelector('.good').hidden = f.querySelector('.good-q').hidden = !n || !good;
    f.querySelector('.bad').hidden = f.querySelector('.bad-q').hidden = !n || good;
    f.querySelector('[data-more]').hidden = !n;
  };
  f.addEventListener('change', paint);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const d = new FormData(f), n = +(d.get('stars') || 0);
    const allowed = n >= 4 ? RATING_GOOD : RATING_BAD;
    try {
      const rating = validateRating({ stars: n, tags: d.getAll('tags').filter(t => allowed.includes(t)), comment: d.get('comment') });
      f.querySelector('button[type=submit]').disabled = true;
      await store.rateJob(token, rating); toast('Thanks!'); render();
    } catch (err) { f.querySelector('[data-err]').textContent = err.message; f.querySelector('button[type=submit]').disabled = false; }
  });
}

function payHtml(s, amount) {
  const links = payLinks(s.pay, amount);
  if (!links.length) return '';
  return `<div class="card"><h2 style="margin-top:0">Pay ${esc(money(amount))}</h2><p class="meta">Pay now or on the day, whichever you like.</p>
    <div class="btns">${links.map(l => l.href ? `<a class="btn${l.label === 'Pay by card' ? '' : ' ghost'}" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>` : `<span class="btn ghost" style="cursor:default">${esc(l.label)}</span>`).join('')}</div></div>`;
}

function receiptHtml(r, s) {
  const p = r.paid;
  return `<div class="card receipt"><h2 style="margin-top:0">Receipt</h2>
    <div class="meta">${esc(s.business || tradeOf(s.trade).defaultBusiness)}</div>
    <div class="row-line"><span>${esc(r.services.join(', ') || 'Service')}</span><b>${money(p.amount)}</b></div>
    ${p.tip ? `<div class="row-line"><span>Tip</span><b>${money(p.tip)}</b></div>` : ''}
    <div class="row-line total"><span>Paid${p.method ? ' by ' + esc(p.method) : ''}</span><b>${money(p.amount + (p.tip || 0))}</b></div>
    <div class="meta">${esc(prettyDay(localDay(new Date(p.at))))} · Thank you!</div></div>`;
}

// ---------- detailer: inbox ----------
// Regular customers due for their next visit, with a ready-to-send reminder.
function rebookHtml(all, s) {
  const due = dueForRebook(all, localDay());
  if (!due.length) return '';
  return `<div class="card rebook"><b>🔁 Time to rebook</b><p class="meta">Regulars due soon. Send them a reminder so they book again.</p>
    ${due.map(d => `<div class="block-row"><div><b>${esc(d.req.name)}</b><div class="meta">${esc(REPEAT_CHOICES.find(c => c[0] === String(d.weeks))[1])} · due ${esc(prettyDay(d.due))}</div></div>
      <button class="btn small" data-remind="${esc(d.req.id)}">Copy reminder</button></div>`).join('')}</div>`;
}
function bindRebook(all, s) {
  app.querySelectorAll('[data-remind]').forEach(b => b.onclick = () => {
    const r = all.find(x => x.id === b.dataset.remind);
    const what = (r.services || [])[0] ? (r.services[0]).toLowerCase() : 'visit';
    copy(`Hi ${r.name.split(' ')[0]}, it's ${s.owner ? s.owner : 'me'} from ${s.business || 'here'}. It's about time for your next ${what}. Tap here to book again: ${baseLink()}#q-${r.token}`);
  });
}

async function viewInbox() {
  await shell(false);
  const everything = await store.listRequests();
  const st0 = await store.getSettings();
  const reqs = inboxOrder(everything.filter(r => r.status !== 'done' && r.status !== 'declined'));
  if (!reqs.length) {
    app.innerHTML = `<h1>Requests</h1>${startCard(st0)}${rebookHtml(everything, st0)}${await phoneCallButton()}<div class="card empty">No open requests yet.<br><br><a class="btn" href="#share">Share your link</a></div>`;
    bindRebook(everything, st0);
    return;
  }
  const settings = st0;
  const t = tradeOf(settings.trade);
  app.innerHTML = `<h1>Requests</h1>${startCard(settings)}${rebookHtml(everything, settings)}${await phoneCallButton()}` + reqs.map(r => card(r, t)).join('');
  bindRebook(everything, settings);
  const all = await store.listRequests();
  bindCards(settings, all);
}

// Owners turn the trade's optional questions on or off and trim the answers.
function extraQuestionsHtml(s) {
  const qs = (tradeOf(s.trade).questions || []).filter(q => q.key && !q.required);
  if (!qs.length) return '';
  const ov = s.questions || {};
  return `<label>Extra questions on your form</label><p class="meta">Untick what you don't need to ask. Delete answers that don't fit your work.</p>
    ${qs.map(q => { const o = ov[q.key] || {}; return `<div class="q-edit"><label class="chip"><input type="checkbox" name="ask_${esc(q.key)}"${o.off ? '' : ' checked'}><span>${esc(q.label)}</span></label>
      ${q.options ? `<textarea name="opts_${esc(q.key)}" rows="${Math.min(6, q.options.length)}" aria-label="Answers for ${esc(q.label)}">${esc((o.options || q.options).join('\n'))}</textarea>` : ''}</div>`; }).join('')}`;
}

// Three steps for new owners. Disappears once all are done, or when they tap "Hide".
function startCard(s) {
  if (s.startHidden) return '';
  const steps = [
    [!!s.hours, 'Set your working hours', '#settings', 3],
    [!!((s.sizes || []).length || s.pkg?.name || (s.services || []).length), 'Add your services and prices', '#settings', 1],
    [!!s.shared, 'Send your link to a customer', '#share', -1],
  ];
  if (steps.every(x => x[0])) return '';
  return `<div class="card start"><b>Get started</b>${steps.map(([done, label, href, sec], i) =>
    `<a class="step${done ? ' done' : ''}" href="${href}" data-sec="${sec}"><span class="num">${done ? '✓' : i + 1}</span>${label}</a>`).join('')}
    <button class="btn ghost small" data-hide-start>Hide this</button></div>`;
}

document.addEventListener('click', async e => {
  const step = e.target.closest('.step[data-sec]');
  if (step && +step.dataset.sec >= 0) lastOpenSec = +step.dataset.sec;
  if (e.target.closest('[data-hide-start]')) { await store.saveSettings({ startHidden: true }); render(); }
});

// When a customer calls, the owner fills in the same request form for them.
async function phoneCallButton() {
  const biz = await store.business();
  const href = store.mode === 'cloud' ? '#book-' + biz.slug : '#request';
  return `<div class="btns" style="margin:0 0 12px"><a class="btn ghost small" href="${esc(href)}">📞 Took a call? Fill in the form for them</a></div>`;
}

function card(r, t) {
  const contact = [r.phone && `📞 ${esc(r.phone)}`, r.email && `✉️ ${esc(r.email)}`].filter(Boolean).join(' · ');
  const tomorrow = localDay(new Date(Date.now() + 864e5)) + 'T09:00';
  return `<div class="card" data-id="${esc(r.id)}">
    <div class="req-head"><div><b>${esc(r.name)}</b><div class="meta">${esc(r.vehicle)}</div></div><span class="status ${r.status}">${STATUS_LABEL[r.status]}</span></div>
    <div class="meta">${contact}</div>
    ${r.address ? `<div class="meta">📍 ${esc(r.address)}</div>` : ''}
    ${r.ref ? `<div class="meta">🤝 Sent by ${esc(r.ref)}</div>` : ''}
    ${repeatLabel(r) ? `<div class="meta">🔁 Wants it ${esc(repeatLabel(r).toLowerCase())}</div>` : ''}
    <div class="tags">${r.size ? `<span>📏 ${esc(r.size)}</span>` : ''}${r.services.map(x => `<span>${esc(x)}</span>`).join('')}${r.times.map(x => `<span>🕑 ${esc(x)}</span>`).join('')}</div>
    ${r.notes ? `<p class="meta">“${esc(r.notes)}”</p>` : ''}
    ${detailsHtml(r, t)}
    ${ownerNoteHtml(r)}
    ${r.photos.length ? `<div class="photos">${r.photos.map((p, i) => `<a href="${p}" target="_blank" rel="noopener"><img src="${p}" alt="Photo ${i + 1} from ${esc(r.name)}"></a>`).join('')}</div>` : ''}
    ${r.status === 'accepted'
      ? `<div class="quote-box">Booked for <b>${esc(prettyWhen(r.quote.when))}</b> at <b>${money(r.quote.price)}</b>. It's on your <a href="#today">Calendar</a>.</div>`
      : `<form class="quote-box" data-quote>
          <div class="row">
            <div><label>Price</label><input name="price" inputmode="decimal" placeholder="$" value="${r.quote ? r.quote.price : (r.sizePrice || '')}"></div>
            <div><label>Day and time</label><input name="when" type="datetime-local" value="${r.quote ? r.quote.when : tomorrow}"></div>
          </div>
          <label>Note (optional)</label><input name="note" placeholder="${esc(t.noteHint)}" value="${esc(r.quote?.note || '')}">
          <div class="warn" data-warn></div>
          <div class="errors" data-err></div>
          <div class="btns"><button class="btn" type="submit">${r.status === 'quoted' ? 'Update price' : 'Send price'}</button>
          <button class="btn danger small" type="button" data-decline>Decline</button></div>
        </form>`}
    ${r.status === 'quoted' ? `<div class="btns"><button class="btn ghost small" data-copy="${esc(r.token)}">Copy link for ${esc(r.name.split(' ')[0])}</button><a class="btn ghost small" href="#q-${esc(r.token)}">See what they see</a></div>` : ''}
  </div>`;
}

function bindCards(settings, all) {
  app.querySelectorAll('[data-id]').forEach(el => {
    const id = el.dataset.id;
    const whenEl = el.querySelector('[name=when]'), warnEl = el.querySelector('[data-warn]');
    const check = () => { if (!whenEl || !warnEl) return; const w = whenEl.value; warnEl.innerHTML = /T\d\d:\d\d/.test(w) ? clashes(settings, all, w.slice(0, 16), id).map(x => '⚠️ ' + esc(x)).join('<br>') : ''; };
    whenEl?.addEventListener('input', check); whenEl?.addEventListener('change', check); check();
    el.querySelector('[data-quote]')?.addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        const r = await store.getRequest(id);
        await store.putRequest(applyQuote(r, { price: f.get('price'), when: f.get('when'), note: f.get('note'), now: nowIso() }));
        toast('Price saved. Send them their link.');
        render();
      } catch (err) { el.querySelector('[data-err]').textContent = err.message; }
    });
    el.querySelector('[data-decline]')?.addEventListener('click', async () => {
      const r = await store.getRequest(id);
      await store.putRequest(applyDecline(r, { now: nowIso() })); toast('Declined'); render();
    });
    el.querySelector('[data-onote-save]')?.addEventListener('click', async () => {
      try {
        const r = await store.getRequest(id);
        await store.putRequest({ ...r, ownerNote: el.querySelector('[data-onote]').value.trim().slice(0, 2000) });
        toast('Notes saved');
      } catch (err) { toast(err.message); }
    });
    el.querySelector('[data-copy]')?.addEventListener('click', e => copy(`${baseLink()}#q-${e.currentTarget.dataset.copy}`));
  });
}

// ---------- detailer: calendar (week and day) ----------
async function viewToday() {
  await shell(false);
  const reqs = await store.listRequests();
  if (calMode === 'week') return viewWeek(reqs, await store.getSettings());
  const jobs = jobsForDay(reqs, viewDay);
  const settings = await store.getSettings();
  const isToday = viewDay === localDay();
  const hrs = hoursOf(settings)[WEEKDAYS[new Date(viewDay + 'T12:00').getDay()]];
  const blocks = blocksOn(settings, viewDay);
  const label = prettyWhen(viewDay + 'T00:00').split(',').slice(0, 2).join(',');
  app.innerHTML = `
  <div class="btns" style="margin:0 0 10px"><button class="btn ghost small" data-week>◀ Week</button></div>
  <div class="daynav"><button class="btn ghost small" data-day="-1" aria-label="Previous day">◀</button><strong>${isToday ? 'Today · ' : ''}${esc(label)}</strong><button class="btn ghost small" data-day="1" aria-label="Next day">▶</button></div>
  <div class="big-total"><span>${jobs.length} job${jobs.length === 1 ? '' : 's'}</span><b>${money(dayTotal(jobs))}</b></div>
  ${jobs.length ? jobs.map(r => `<div class="card">
      <div class="req-head"><div><div class="job-time">${esc(prettyWhen(r.quote.when).split(', ').pop())}</div><b>${esc(r.name)}</b> · ${esc(r.vehicle)}</div><span class="status ${r.status}">${money(r.quote.price)}</span></div>
      <div class="tags">${r.services.map(x => `<span>${esc(x)}</span>`).join('')}</div>
      ${r.address ? `<div class="meta">📍 ${esc(r.address)}</div>` : ''}
      ${r.phone ? `<div class="meta">📞 ${esc(r.phone)}</div>` : ''}
      ${r.notes ? `<p class="meta">“${esc(r.notes)}”</p>` : ''}
      ${r.quote.note ? `<p class="meta">Note to customer: ${esc(r.quote.note)}</p>` : ''}
      ${detailsHtml(r, tradeOf(settings.trade))}
      ${r.ownerNote ? `<p class="meta">📝 ${esc(r.ownerNote)}</p>` : ''}
      ${r.ref ? `<p class="meta">🤝 Sent by ${esc(r.ref)}</p>` : ''}
      ${repeatLabel(r) ? `<p class="meta">🔁 ${esc(repeatLabel(r))}</p>` : ''}
      ${r.rating ? `<div class="quote-box"><span class="stars-show">${starsText(r.rating.stars)}</span>${(r.rating.tags || []).length ? ' · ' + esc(r.rating.tags.join(', ')) : ''}${r.rating.comment ? `<br>“${esc(r.rating.comment)}”` : ''}</div>` : ''}
      <div class="btns">${r.address ? `<a class="btn ghost small" href="${mapsLink(r.address)}" target="_blank" rel="noopener">Directions</a>` : ''}
      ${r.status === 'accepted' ? `<button class="btn small" data-done="${esc(r.id)}">Mark done</button>` : `<span class="status done">Done</span>`}
      ${r.status === 'done' && !r.rating ? `<button class="btn ghost small" data-askrate="${esc(r.token)}">⭐ Copy rating link for ${esc(r.name.split(' ')[0])}</button>` : ''}</div>
      ${r.paid ? `<div class="quote-box">💵 Paid <b>${money(r.paid.amount + (r.paid.tip || 0))}</b>${r.paid.tip ? ` (incl. ${money(r.paid.tip)} tip)` : ''} · ${esc(r.paid.method)} <button class="btn ghost small" data-unpaid="${esc(r.id)}">Undo</button></div>`
        : `<details class="answers"><summary>💵 Mark paid</summary><form data-paid="${esc(r.id)}" novalidate>
          <div class="row"><div><label>Amount</label><input name="amount" inputmode="decimal" value="${r.quote.price}"></div><div><label>Tip (optional)</label><input name="tip" inputmode="decimal" placeholder="$0"></div></div>
          <label>How they paid</label><select name="method">${PAY_METHODS.map(m => `<option>${m}</option>`).join('')}</select>
          <div class="errors" data-err></div><button class="btn small" type="submit" style="margin-top:10px">Save payment</button></form></details>`}
    </div>`).join('') : `<div class="card empty">Nothing booked${isToday ? ' today' : ' this day'}.</div>`}
  <h2>Availability</h2>
  <div class="card">
    <p class="meta">${hrs ? `Your hours: ${esc(prettyTime(hrs[0]))} to ${esc(prettyTime(hrs[1]))}` : 'Closed on this day of the week'} · <a href="#settings">change</a></p>
    ${blocks.map(b => `<div class="block-row"><span>⛔ ${b.start ? `${esc(prettyTime(b.start))} to ${esc(prettyTime(b.end))}` : 'Whole day off'}${b.note ? ` · ${esc(b.note)}` : ''}</span><button class="btn ghost small" data-unblock="${esc(b.id)}">Remove</button></div>`).join('')}
    <form id="blk" novalidate>
      <label class="chip" style="margin-top:8px"><input type="checkbox" name="whole" checked><span>Whole day</span></label>
      <div class="row" data-times hidden><div><label>From</label><input type="time" name="start" value="12:00"></div><div><label>To</label><input type="time" name="end" value="14:00"></div></div>
      <label>Note (only you see it)</label><input name="note" placeholder="For example: vacation, dentist">
      <div class="errors" data-err></div>
      <button class="btn ghost small" type="submit" style="margin-top:10px">Block this time off</button>
    </form>
  </div>`;
  const blk = $('#blk');
  blk.whole.onchange = () => { blk.querySelector('[data-times]').hidden = blk.whole.checked; };
  blk.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const b = validateBlock({ id: newId(), date: viewDay, ...(blk.whole.checked ? {} : { start: blk.start.value, end: blk.end.value }), note: blk.note.value });
      await store.saveSettings({ blocks: [...(settings.blocks || []).filter(x => x.date >= localDay()), b] });
      toast('Blocked off'); render();
    } catch (err) { blk.querySelector('[data-err]').textContent = err.message; }
  });
  app.querySelectorAll('[data-unblock]').forEach(b => b.onclick = async () => {
    await store.saveSettings({ blocks: (settings.blocks || []).filter(x => x.id !== b.dataset.unblock) });
    toast('Removed'); render();
  });
  app.querySelector('[data-week]').onclick = () => { calMode = 'week'; render(); };
  app.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { viewDay = shiftDay(viewDay, Number(b.dataset.day)); render(); });
  app.querySelectorAll('[data-paid]').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const r = await store.getRequest(f.dataset.paid);
      await store.putRequest(applyPaid(r, { amount: f.amount.value, tip: f.tip.value, method: f.method.value, now: nowIso() }));
      toast('Payment saved'); render();
    } catch (err) { f.querySelector('[data-err]').textContent = err.message; }
  }));
  app.querySelectorAll('[data-askrate]').forEach(b => b.onclick = () => copy(`${baseLink()}#q-${b.dataset.askrate}`));
  app.querySelectorAll('[data-unpaid]').forEach(b => b.onclick = async () => {
    const r = await store.getRequest(b.dataset.unpaid);
    await store.putRequest(applyUnpaid(r, { now: nowIso() })); toast('Payment removed'); render();
  });
  app.querySelectorAll('[data-done]').forEach(b => b.onclick = async () => {
    const r = await store.getRequest(b.dataset.done);
    await store.putRequest(applyDone(r, { now: nowIso() })); toast('Nice work'); render();
  });
}

// Money actually received (jobs marked paid). Hidden until the owner marks something paid.
function earningsHtml(reqs) {
  if (!reqs.some(r => r.paid)) return '';
  const e = earnings(reqs);
  return `<div class="card earn"><div><span>This week</span><b>${money(e.week)}</b></div><div><span>This month</span><b>${money(e.month)}</b></div><div><span>This year</span><b>${money(e.year)}</b></div>
    ${e.owedCount ? `<p class="meta" style="grid-column:1/-1;margin:6px 0 0">Not marked paid yet: ${money(e.owed)} from ${e.owedCount} job${e.owedCount === 1 ? '' : 's'}${e.tips ? ` · Tips this year: ${money(e.tips)}` : ''}</p>` : e.tips ? `<p class="meta" style="grid-column:1/-1;margin:6px 0 0">Tips this year: ${money(e.tips)}</p>` : ''}</div>`;
}

// Average stars and the latest comments. Hidden until the first rating.
function ratingsHtml(reqs) {
  const r = ratingSummary(reqs);
  if (!r.count) return '';
  return `<details class="card answers"><summary>⭐ <b>${r.avg}</b> from ${r.count} rating${r.count === 1 ? '' : 's'}${r.flags ? ` · ⚠️ ${r.flags} damage or no-show` : ''}</summary>
    ${r.recent.map(x => `<div class="block-row"><div><span class="stars-show">${starsText(x.rating.stars)}</span> <b>${esc(x.name.split(' ')[0])}</b>${(x.rating.tags || []).length ? ` · ${esc(x.rating.tags.join(', '))}` : ''}${x.rating.comment ? `<div class="meta">“${esc(x.rating.comment)}”</div>` : ''}</div></div>`).join('')}</details>`;
}

function viewWeek(reqs, settings) {
  const week = weekOf(reqs, viewDay);
  const today = localDay();
  const total = week.reduce((t, d) => t + d.total, 0);
  const count = week.reduce((t, d) => t + d.jobs.length, 0);
  const short = day => prettyWhen(day + 'T00:00').split(',').slice(0, 2).join(',');
  app.innerHTML = `
  <div class="daynav"><button class="btn ghost small" data-wk="-7" aria-label="Previous week">◀</button><strong>${esc(short(week[0].date))} – ${esc(short(week[6].date).split(', ')[1])}</strong><button class="btn ghost small" data-wk="7" aria-label="Next week">▶</button></div>
  <div class="big-total"><span>${count} job${count === 1 ? '' : 's'} this week</span><b>${money(Math.round(total * 100) / 100)}</b></div>
  ${earningsHtml(reqs)}
  ${ratingsHtml(reqs)}
  ${week.map(d => `<div class="card day${d.date === today ? ' is-today' : ''}" data-open="${d.date}" role="button" tabindex="0">
      <div class="day-head"><b>${d.date === today ? 'Today · ' : ''}${esc(short(d.date))}</b><span>${d.jobs.length ? money(d.total) : ''}</span></div>
      ${d.jobs.map(r => `<div class="slot${r.status === 'done' ? ' done' : ''}"><span class="t">${esc(prettyWhen(r.quote.when).split(', ').pop())}</span><span class="w">${esc(r.name.split(' ')[0])} · ${esc(r.vehicle)}</span></div>`).join('')}
      ${blocksOn(settings, d.date).map(b => `<div class="slot blocked"><span class="t">${b.start ? esc(prettyTime(b.start)) : 'All day'}</span><span class="w">Blocked${b.note ? ' · ' + esc(b.note) : ''}</span></div>`).join('')}
      ${!d.jobs.length && !blocksOn(settings, d.date).length ? `<div class="free">${isOpenDay(settings, d.date) ? 'Open' : 'Closed'}</div>` : ''}
    </div>`).join('')}
  ${week.some(d => d.date === today) ? '' : `<div class="btns"><button class="btn ghost small" data-this>Back to this week</button></div>`}`;
  app.querySelectorAll('[data-wk]').forEach(b => b.onclick = () => { viewDay = shiftDay(viewDay, Number(b.dataset.wk)); render(); });
  app.querySelector('[data-this]')?.addEventListener('click', () => { viewDay = localDay(); render(); });
  app.querySelectorAll('[data-open]').forEach(el => {
    const open = () => { viewDay = el.dataset.open; calMode = 'day'; render(); };
    el.onclick = open;
    el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
  });
}

// ---------- detailer: share link ----------
async function viewShare() {
  await shell(false);
  const biz = await store.business();
  const link = `${baseLink()}#${cloud ? 'book-' + biz.slug : 'request'}`;
  app.innerHTML = `<h1>Your booking link</h1>
  <p class="lead">Text this to customers, or put it in your Instagram or Facebook bio. They describe what they need, and it shows up in Requests.</p>
  <div class="card"><div class="linkbox"><input readonly value="${esc(link)}" aria-label="Your booking link"><button class="btn small" id="cp">Copy</button></div>
  ${navigator.share ? '<button class="btn block" id="sh">📤 Send my link</button>' : ''}
  <div class="btns"><a class="btn ghost small" href="#${cloud ? 'book-' + esc(biz.slug) : 'request'}">See what customers see</a></div></div>
  <h2>Post it on your socials</h2>
  <div class="card"><p class="meta">A ready-made picture with your name and a QR code. Post it, put it in your story, or print it for your truck or a flyer. People scan it with their camera to book.</p>
    <canvas id="postpic" width="1080" height="1350" class="postpic" aria-label="Picture to post"></canvas>
    <div class="btns">${navigator.canShare ? '<button class="btn" id="sharepic">📤 Share picture</button>' : ''}<button class="btn ghost" id="savepic">⬇️ Save picture</button><button class="btn ghost" id="cpcap">Copy caption</button></div>
    <p class="meta">Tip: on Instagram, also put your link in your bio. On Facebook, add a "Book now" button to your page with this link.</p></div>
  ${store.mode === 'demo' ? `<p class="meta">Demo note: right now requests only show up on this same device. The shared version comes next.</p>` : ''}`;
  const shared = () => store.getSettings().then(st => st.shared ? null : store.saveSettings({ shared: true })).catch(() => {});
  $('#cp').onclick = () => { copy(link); shared(); };
  const st = await store.getSettings();
  const r = ratingSummary(await store.listRequests());
  const name = st.business || biz.settings?.business || tradeOf(st.trade).defaultBusiness;
  drawPostPic($('#postpic'), { name, tagline: tradeOf(st.trade).tagline, area: st.area, link, stars: r.count >= 3 && r.avg >= 4 ? r : null });
  const caption = `Book ${name} in 1 minute 👇\n${link}\nTell me what you need and I'll send you a price and a time.`;
  $('#cpcap').onclick = () => { copy(caption); shared(); };
  const file = () => new Promise(ok => $('#postpic').toBlob(b => ok(new File([b], 'book-' + (biz.slug || 'me') + '.png', { type: 'image/png' })), 'image/png'));
  $('#savepic').onclick = async () => { const f = await file(); const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); shared(); };
  $('#sharepic')?.addEventListener('click', async () => {
    const f = await file();
    try {
      if (navigator.canShare({ files: [f] })) await navigator.share({ files: [f], text: caption });
      else await navigator.share({ text: caption, url: link });
      shared();
    } catch {}
  });
  $('#sh')?.addEventListener('click', async () => {
    try { await navigator.share({ title: biz.settings?.business || 'Book with me', text: 'Send me your request here:', url: link }); shared(); } catch {}
  });
}

// The social media picture: name, what they do, big QR code, stars once they have 3+ good ratings.
function drawPostPic(cv, { name, tagline, area, link, stars }) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  const font = (w, px) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  c.fillStyle = '#0f766e'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#ffffff'; c.textAlign = 'center';
  const fit = (text, w, max, min) => { let px = max; do { c.font = font(800, px); px -= 4; } while (c.measureText(text).width > w && px > min); };
  fit(name, W - 120, 96, 44); c.fillText(name, W / 2, 170);
  c.font = font(500, 46); c.fillStyle = '#d7f0ec'; c.fillText([tagline, area].filter(Boolean).join(' · ').slice(0, 44), W / 2, 240);
  let y = 300;
  if (stars) { c.font = font(700, 56); c.fillStyle = '#fcd34d'; c.fillText(`★ ${stars.avg} from ${stars.count} customers`, W / 2, 330); y = 370; }
  const q = qrcode(0, 'M'); q.addData(link); q.make();
  const n = q.getModuleCount(), box = 640, cell = Math.floor(box / (n + 8)), size = cell * (n + 8), x0 = Math.round((W - size) / 2), y0 = y + 20;
  c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect ? c.roundRect(x0, y0, size, size, 36) : c.rect(x0, y0, size, size); c.fill();
  c.fillStyle = '#14202b';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) c.fillRect(x0 + (k + 4) * cell, y0 + (r + 4) * cell, cell, cell);
  c.fillStyle = '#ffffff'; c.font = font(800, 84); c.fillText('Book in 1 minute', W / 2, y0 + size + 120);
  c.font = font(500, 44); c.fillStyle = '#d7f0ec'; c.fillText('Scan with your phone camera', W / 2, y0 + size + 190);
  c.fillText('or tap the link in my bio', W / 2, y0 + size + 245);
}

// ---------- detailer: settings ----------
let lastOpenSec = -1;
async function viewSettings() {
  await shell(false);
  const s = await store.getSettings();
  const openDays = WEEKDAYS.filter(k => hoursOf(s)[k]).length;
  const sec = (icon, title, status) => `<summary><span class="sec-i">${icon}</span><span class="sec-t">${title}<small>${esc(status)}</small></span></summary>`;
  app.innerHTML = `<h1>Settings</h1>
  <p class="meta">Tap a section to open it.</p>
  <details class="sec">${sec('🏷️', 'Your business', s.business || 'Name, area, message')}
  <form id="st" class="card">
    <label for="trade">Type of work</label><select id="trade" name="trade">${Object.entries(TRADES).map(([k, v]) => `<option value="${k}"${k === (s.trade || 'detailing') ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select>
    <label for="business">Business name</label><input id="business" name="business" value="${esc(s.business)}" placeholder="${esc(tradeOf(s.trade).defaultBusiness)}">
    <label for="owner">Your first name</label><input id="owner" name="owner" value="${esc(s.owner)}">
    <label for="area">Area you cover</label><input id="area" name="area" value="${esc(s.area)}" placeholder="For example Orlando and Oviedo">
    ${tradeOf(s.trade).atShop ? `<label for="shopAddress">Shop address (customers see it once booked)</label><input id="shopAddress" name="shopAddress" value="${esc(s.shopAddress || '')}">` : `<input type="hidden" name="shopAddress" value="${esc(s.shopAddress || '')}">`}
    <label for="intro">Message at the top of your form</label><textarea id="intro" name="intro" placeholder="${esc(tradeOf(s.trade).intro)}">${esc(s.intro)}</textarea>
    <button class="btn block" type="submit">Save</button>
  </form></details>
  <details class="sec">${sec('💲', 'Services and prices', `${servicesOf(s).length} choices${(s.sizes || []).length ? ' · prices set' : ''}`)}
  <form id="svc" class="card">
    <p class="meta">Shown at the top of your customer form. All optional.</p>
    <label for="pkgName">Service name</label><input id="pkgName" name="pkgName" maxlength="80" value="${esc(s.pkg?.name || '')}" placeholder="For example The Inside And Outside Detail">
    <label for="pkgTime">How long it takes</label><input id="pkgTime" name="pkgTime" maxlength="40" value="${esc(s.pkg?.time || '')}" placeholder="For example 2 hr 30 min+">
    <label for="pkgAbout">What's included</label><textarea id="pkgAbout" name="pkgAbout" maxlength="3000" rows="8" placeholder="One item per line. End a line with : to make a heading, like Interior:">${esc(s.pkg?.about || '')}</textarea>
    <label for="choices">Choices customers can tick</label>
    <textarea id="choices" name="choices" rows="6" maxlength="1000">${esc(servicesOf(s).join('\n'))}</textarea>
    <p class="meta">One per line. Delete the ones you don't offer, add your own.</p>
    <label for="sizes">${esc(tradeOf(s.trade).sizesLabel || 'Sizes')} and starting prices</label>
    <textarea id="sizes" name="sizes" rows="4" placeholder="One per line, for example:&#10;Car = 120&#10;Small SUV = 140&#10;Large SUV / pickup = 170+">${esc(sizesText(s.sizes))}</textarea>
    <p class="meta">Customers tap one. Add + after a price for "and up". The price fills in when you quote.</p>
    ${extraQuestionsHtml(s)}
    <div class="errors" data-err></div>
    <button class="btn block" type="submit">Save service and prices</button>
  </form></details>
  <details class="sec">${sec('💵', 'Getting paid', s.pay?.on ? 'Pay buttons on' : 'Off (optional)')}
  <form id="pay" class="card" novalidate>
    <label class="chip"><input type="checkbox" name="on"${s.pay?.on ? ' checked' : ''}><span>Show pay buttons to customers after they book</span></label>
    <p class="meta">Money goes straight to you. ShineSlot never touches it and takes nothing. Fill in only the ones you use.</p>
    <div class="row"><div><label for="cashapp">Cash App</label><input id="cashapp" name="cashapp" value="${esc(s.pay?.cashapp ? '$' + s.pay.cashapp : '')}" placeholder="$YourCashtag"></div>
      <div><label for="venmo">Venmo</label><input id="venmo" name="venmo" value="${esc(s.pay?.venmo ? '@' + s.pay.venmo : '')}" placeholder="@your-name"></div></div>
    <div class="row"><div><label for="paypal">PayPal.me name</label><input id="paypal" name="paypal" value="${esc(s.pay?.paypal || '')}" placeholder="yourname"></div>
      <div><label for="zelle">Zelle (phone or email)</label><input id="zelle" name="zelle" value="${esc(s.pay?.zelle || '')}"></div></div>
    <label for="cardLink">Card payment link (from Square or Stripe)</label><input id="cardLink" name="cardLink" value="${esc(s.pay?.cardLink || '')}" placeholder="https://square.link/...">
    <p class="meta">Mark jobs paid from the Calendar to see your earnings by week, month and year. That works even with pay buttons off.</p>
    <div class="errors" data-err></div>
    <button class="btn block" type="submit">Save payment settings</button>
  </form></details>
  <details class="sec">${sec('🕘', 'Working hours', `Open ${openDays} day${openDays === 1 ? '' : 's'} a week`)}
  <form id="hrs" class="card">
    <p class="meta">Customers only see open days. To take a single day or a few hours off, open that day in the Calendar.</p>
    ${['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(k => { const h = hoursOf(s)[k]; return `<div class="hours-row"><label class="chip"><input type="checkbox" name="open-${k}"${h ? ' checked' : ''}><span>${WEEKDAY_NAMES[k].slice(0, 3)}</span></label>
      <input type="time" name="start-${k}" value="${h ? h[0] : '09:00'}" aria-label="${WEEKDAY_NAMES[k]} start"><span>to</span><input type="time" name="end-${k}" value="${h ? h[1] : '17:00'}" aria-label="${WEEKDAY_NAMES[k]} end"></div>`; }).join('')}
    <div class="errors" data-err></div>
    <button class="btn block" type="submit">Save hours</button>
  </form></details>
  ${cloud && s.ntfyTopic ? `<details class="sec">${sec('🔔', 'Phone alerts', 'On')}${alertsCard(s)}</details>` : ''}
  ${cloud ? await businessesCard() : ''}
  ${store.mode === 'demo' ? `<h2>Demo tools</h2><div class="card"><p class="meta">Fill the app with a few made-up requests to try it out, or start over.</p>
    <div class="btns"><button class="btn ghost small" id="seed">Add sample requests</button><button class="btn danger small" id="wipe">Clear everything</button></div></div>` : ''}`;
  // Keep the section you were working in open after saving.
  app.querySelectorAll('details.sec').forEach((d, i) => { if (i === lastOpenSec) d.open = true; d.addEventListener('toggle', () => { if (d.open) lastOpenSec = i; }); });
  $('#st').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    await store.saveSettings({ trade: f.get('trade'), business: f.get('business').trim(), owner: f.get('owner').trim(), area: f.get('area').trim(), shopAddress: f.get('shopAddress').trim(), intro: f.get('intro').trim() });
    toast('Saved'); render();
  });
  $('#seed')?.addEventListener('click', async () => {
    for (const r of sampleRequests(new Date(), (await store.getSettings()).trade)) await store.putRequest(r);
    toast('Sample requests added'); location.hash = 'inbox';
  });
  bindAlerts(s);
  $('#hrs').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target), hours = {};
    for (const k of WEEKDAYS) {
      if (!f.get('open-' + k)) { hours[k] = null; continue; }
      const a = f.get('start-' + k), b = f.get('end-' + k);
      if (!a || !b || b <= a) { e.target.querySelector('[data-err]').textContent = `${WEEKDAY_NAMES[k]}: the end time must be after the start time.`; return; }
      hours[k] = [a, b];
    }
    await store.saveSettings({ hours }); toast('Hours saved'); render();
  });
  $('#pay').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const { pay, errors } = validatePay({ on: !!f.get('on'), cashapp: f.get('cashapp'), venmo: f.get('venmo'), paypal: f.get('paypal'), zelle: f.get('zelle'), cardLink: f.get('cardLink') });
    if (errors.length) { e.target.querySelector('[data-err]').innerHTML = errors.map(esc).join('<br>'); return; }
    await store.saveSettings({ pay }); toast('Saved'); render();
  });
  $('#svc').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const { sizes, errors: e1 } = parseSizes(f.get('sizes'));
    const { choices, errors: e2 } = parseChoices(f.get('choices'));
    const { questions, errors: e3 } = parseQuestions(s.trade, Object.fromEntries(f.entries()));
    const errors = [...e2, ...e1, ...e3];
    if (errors.length) { e.target.querySelector('[data-err]').innerHTML = errors.map(esc).join('<br>'); return; }
    const pkg = { name: f.get('pkgName').trim(), time: f.get('pkgTime').trim(), about: f.get('pkgAbout').trim() };
    const same = choices.join('\n') === tradeOf((await store.getSettings()).trade).services.join('\n');
    await store.saveSettings({ sizes, pkg, services: same ? null : choices, questions }); toast('Saved'); render();
  });
  $('#out')?.addEventListener('click', async () => { await store.signOut(); render(); });
  let armed = false;
  $('#wipe')?.addEventListener('click', async e => {
    if (!armed) { armed = true; e.target.textContent = 'Tap again to clear'; return; }
    await store.reset(); toast('Cleared'); render();
  });
}

// One login can run more than one business (for example detailing and window tint).
async function businessesCard() {
  const all = await store.businesses(), cur = await store.business();
  return `<details class="sec">${'<summary><span class="sec-i">🏢</span><span class="sec-t">Your businesses<small>' + all.length + ' · add another or sign out</small></span></summary>'}<div class="card">
    ${all.map(b => `<div class="block-row"><div><b>${esc(b.settings.business || b.slug)}</b><div class="meta">${esc(tradeOf(b.settings.trade).name)} · #book-${esc(b.slug)}</div></div>
      ${b.id === cur.id ? '<span class="status accepted">Open now</span>' : `<button class="btn ghost small" data-switch="${esc(b.id)}">Switch</button>`}</div>`).join('')}
    <div class="btns"><a class="btn ghost small" href="#new">+ Add another business</a><button class="btn ghost small" id="out">Sign out</button></div></div></details>`;
}

document.addEventListener('click', async e => {
  const sw = e.target.closest('[data-switch]');
  if (!sw) return;
  store.selectBusiness(sw.dataset.switch);
  toast('Switched'); location.hash = 'inbox'; render();
});

// ---------- phone alerts (ntfy) ----------
// Each business gets a long random topic name; the database sends an alert there for every new request.
function newTopic() {
  const a = new Uint8Array(12); crypto.getRandomValues(a);
  return 'shineslot-' + Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

function alertsCard(s) {
  if (!s.ntfyTopic) return `<div class="card"><p class="meta">Get a buzz on your phone for every new request. Free, through the ntfy app. Alerts show the car and the job only.</p>
    <button class="btn small" id="alerts-on">Turn on phone alerts</button></div>`;
  return `<div class="card">
    <p class="meta"><b>1.</b> Install the free <b>ntfy</b> app (App Store or Google Play).<br>
    <b>2.</b> In ntfy tap <b>+</b>, then paste this name and tap Subscribe:</p>
    <div class="linkbox"><input readonly value="${esc(s.ntfyTopic)}" aria-label="Alert name"><button class="btn small" id="alerts-copy">Copy</button></div>
    <p class="meta">Keep this name private: anyone with it can see your alerts.</p>
    <div class="btns"><button class="btn ghost small" id="alerts-test">Send a test alert</button><button class="btn danger small" id="alerts-off">Turn off</button></div></div>`;
}

function bindAlerts(s) {
  $('#alerts-on')?.addEventListener('click', async () => { await store.saveSettings({ ntfyTopic: newTopic() }); toast('Alerts on. Now set up the app.'); render(); });
  $('#alerts-copy')?.addEventListener('click', () => copy(s.ntfyTopic));
  $('#alerts-off')?.addEventListener('click', async () => { await store.saveSettings({ ntfyTopic: '' }); toast('Alerts off'); render(); });
  $('#alerts-test')?.addEventListener('click', async () => {
    try {
      const r = await fetch('https://ntfy.sh/', { method: 'POST', body: JSON.stringify({ topic: s.ntfyTopic, title: 'ShineSlot test', message: 'Alerts are working.', tags: ['car'] }) });
      toast(r.ok ? 'Test sent. Check your phone.' : 'The alert service did not answer. Try again.');
    } catch { toast('Could not reach the alert service.'); }
  });
}

// Keep Requests and Calendar fresh while open, without wiping a price you're typing.
let lastSig = '';
async function refreshIfChanged() {
  const tab = currentTab();
  if (document.hidden || !['inbox', 'today'].includes(tab)) return;
  if (cloud && !(await store.session())) return;
  const sig = (await store.listRequests()).map(r => r.id + r.status).join();
  if (lastSig && sig !== lastSig && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) render();
  lastSig = sig;
}
setInterval(() => refreshIfChanged().catch(() => {}), 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastSig = ''; render(); } });

// ---------- owner sign-in and first setup (online version only) ----------
async function viewLogin() {
  await shell(true, { business: 'ShineSlot', area: 'Sign in to your work desk' });
  app.innerHTML = `<h1>Sign in</h1>
  <p class="lead">For business owners. Customers don't need an account; they use your booking link.</p>
  <form id="li" class="card" novalidate>
    <label for="em">Email</label><input id="em" name="email" type="email" autocomplete="email">
    <label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" minlength="8">
    <div class="errors" id="err"></div>
    <button class="btn block" type="submit" name="act" value="in">Sign in</button>
    <button class="btn block ghost" type="submit" name="act" value="up">Create an account</button>
  </form>`;
  $('#li').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target), act = e.submitter?.value || 'in';
    const email = String(f.get('email')).trim(), pw = String(f.get('password'));
    if (!email || pw.length < 8) { $('#err').textContent = 'Enter your email and a password of at least 8 characters.'; return; }
    try {
      if (act === 'up') {
        const { needsConfirm } = await store.signUp(email, pw);
        if (needsConfirm) { $('#err').textContent = ''; app.querySelector('.lead').textContent = 'Check your email and tap the confirm link, then come back here and sign in.'; return; }
      } else await store.signIn(email, pw);
      render();
    } catch (err) { $('#err').textContent = err.message; }
  });
}

async function viewSetup(another = false) {
  await shell(true, { business: 'ShineSlot', area: another ? 'Add another business' : 'Set up your business' });
  app.innerHTML = `<h1>${another ? 'Add another business' : 'Set up your business'}</h1>
  <p class="lead">${another ? 'It gets its own link, requests and calendar. Switch between them in Settings.' : 'This takes a minute. You can change everything later except the link name.'}</p>
  ${another ? '<p><a href="#settings">← Back</a></p>' : ''}
  <form id="su" class="card" novalidate>
    <label for="trade">Type of work</label><select id="trade" name="trade">${Object.entries(TRADES).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('')}</select>
    <label for="business">Business name</label><input id="business" name="business">
    <label for="slug">Link name (letters, numbers and dashes)</label><input id="slug" name="slug" placeholder="joes-detailing">
    <p class="meta" id="preview"></p>
    <label for="owner">Your first name</label><input id="owner" name="owner">
    <div class="errors" id="err"></div>
    <button class="btn block" type="submit">Create my booking link</button>
  </form>`;
  const slugEl = $('#slug'), prev = () => { $('#preview').textContent = `Your link will end in #book-${slugify(slugEl.value || $('#business').value) || '...'}`; };
  $('#business').addEventListener('input', () => { if (!slugEl.dataset.touched) slugEl.value = slugify($('#business').value); prev(); });
  slugEl.addEventListener('input', () => { slugEl.dataset.touched = '1'; prev(); });
  $('#su').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const business = String(f.get('business')).trim(), slug = slugify(f.get('slug') || business);
    if (!business) { $('#err').textContent = 'Add your business name.'; return; }
    try {
      await store.createBusiness(slug, { trade: f.get('trade'), business, owner: String(f.get('owner')).trim(), area: '', intro: '', shopAddress: '' });
      location.hash = 'share';
    } catch (err) { $('#err').textContent = err.message; }
  });
}

// ---------- router ----------
let lastHash = null;
async function render() {
  const h = location.hash.slice(1);
  if (h === 'today' && lastHash !== 'today') calMode = 'week'; // opening the Calendar tab starts on the week
  lastHash = h;
  try {
    if (h === 'request' && !cloud) await viewRequest('demo');
    else if (h.startsWith('book-')) { const b = splitBookLink(h.slice(5)); await viewRequest(b.slug, b.ref); }
    else if (h.startsWith('q-')) await viewQuote(h.slice(2));
    else if (cloud && !(await store.session())) await viewLogin();
    else if (cloud && !(await store.business())) await viewSetup();
    else if (h === 'new') await viewSetup(true);
    else if (h === 'today') await viewToday();
    else if (h === 'share') await viewShare();
    else if (h === 'settings') await viewSettings();
    else await viewInbox();
  } catch (e) {
    app.innerHTML = `<div class="card errors">Something went wrong: ${esc(e.message)}</div>`;
  }
  window.scrollTo(0, 0);
}

document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) location.hash = go.dataset.go;
});
window.addEventListener('hashchange', render);
render();
