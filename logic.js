// ShineSlot rules: plain functions with no browser or storage code, so they can be tested in Node.

// One app, several trades. Each trade only changes wording and the list of choices.
export const TRADES = {
  detailing: {
    name: 'Detailing',
    defaultBusiness: 'Your Detailing',
    tagline: 'Mobile detailing',
    worker: 'the detailer',
    itemLabel: 'Vehicle',
    itemHint: 'For example 2019 Honda CR-V',
    itemError: 'Add the vehicle (for example 2019 Honda CR-V).',
    addressLabel: 'Where will the car be?',
    servicesLabel: 'What do you want done?',
    services: ['Interior', 'Exterior', 'Full detail', 'Pet hair', 'Stains or odor', 'Headlights', 'Engine bay'],
    notesLabel: 'Anything else?',
    notesHint: 'Stains, pet hair, smoke smell, parking notes...',
    photosLabel: 'Photos of the car',
    intro: 'Tell me about your car and what you need. I will send you a price and a time.',
    noteHint: 'For example: includes pet hair, about 3 hours',
    atShop: false,
  },
  mechanic: {
    name: 'Mechanic',
    defaultBusiness: 'Your Garage',
    tagline: 'Auto repair',
    worker: 'the mechanic',
    itemLabel: 'Vehicle',
    itemHint: 'For example 2019 Honda CR-V',
    itemError: 'Add the vehicle (for example 2019 Honda CR-V).',
    addressLabel: 'Where will the car be?',
    servicesLabel: 'What does it need?',
    services: ['Oil change', 'Brakes', 'Check engine light', 'Battery or starting', 'Noise or vibration', 'AC or heat', 'Tune-up', 'Not sure'],
    notesLabel: "What's going on with it?",
    notesHint: 'Sounds, warning lights, when it started, mileage...',
    photosLabel: 'Photos (dash lights, the problem area)',
    intro: "Tell me about your car and what's wrong. I will send you a price and a time.",
    noteHint: 'For example: parts and labor, about 2 hours',
    atShop: true, // customers bring the car to the garage, so no address is asked
  },
  cleaning: {
    name: 'Cleaning',
    defaultBusiness: 'Your Cleaning',
    tagline: 'Home cleaning',
    worker: 'your cleaner',
    itemLabel: 'Your place',
    itemHint: 'For example 3 bed, 2 bath house',
    itemError: 'Tell us about the place (for example 3 bed, 2 bath house).',
    addressLabel: 'Address',
    servicesLabel: 'What kind of clean?',
    services: ['Standard clean', 'Deep clean', 'Move-in or move-out', 'Kitchen', 'Bathrooms', 'Inside fridge or oven', 'Windows', 'Laundry', 'Office'],
    notesLabel: 'Anything else?',
    notesHint: 'Pets, how often (weekly, every 2 weeks, one time), how to get in, parking...',
    photosLabel: 'Photos of the rooms',
    intro: 'Tell me about your place and what you need. I will send you a price and a time.',
    noteHint: 'For example: deep clean, about 4 hours, supplies included',
    atShop: false,
  },
};
export const tradeOf = key => TRADES[key] || TRADES.detailing;
export const SERVICES = TRADES.detailing.services;
export const TIMES = ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Saturday', 'Sunday'];
export const MAX_PRICE = 10000;
export const MAX_PHOTOS = 4;

// new -> quoted -> accepted -> done. The owner can decline a new or quoted request.
export const STATUS_LABEL = { new: 'New request', quoted: 'Price sent', accepted: 'Booked', done: 'Done', declined: 'Declined' };

const clean = v => String(v ?? '').trim();

export function validateRequest(input, trade = 'detailing') {
  const errors = [];
  if (!clean(input.name)) errors.push('Add your name.');
  const phone = clean(input.phone), email = clean(input.email);
  if (!phone && !email) errors.push('Add a phone number or email so we can reply.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('That email does not look right.');
  if (phone && phone.replace(/\D/g, '').length < 7) errors.push('That phone number looks too short.');
  if (!clean(input.vehicle)) errors.push(tradeOf(trade).itemError); // 'vehicle' holds the car, or the home for cleaning
  if (!Array.isArray(input.services) || input.services.length === 0) errors.push('Pick at least one thing you want done.');
  if (!tradeOf(trade).atShop && !clean(input.address)) errors.push('Add the address or area where the car will be.');
  if ((input.photos || []).length > MAX_PHOTOS) errors.push(`Up to ${MAX_PHOTOS} photos.`);
  return errors;
}

export function makeRequest(input, { id, now, trade = 'detailing' }) {
  const errors = validateRequest(input, trade);
  if (errors.length) throw new Error(errors.join(' '));
  return {
    id,
    createdAt: now,
    status: 'new',
    name: clean(input.name),
    phone: clean(input.phone),
    email: clean(input.email),
    vehicle: clean(input.vehicle),
    services: input.services.map(clean).filter(Boolean),
    times: (input.times || []).map(clean).filter(Boolean),
    address: clean(input.address),
    notes: clean(input.notes),
    photos: (input.photos || []).slice(0, MAX_PHOTOS),
    quote: null,
    history: [{ at: now, what: 'Request sent' }],
  };
}

export function parsePrice(v) {
  const n = Number(String(v ?? '').replace(/[$,\s]/g, ''));
  if (!Number.isFinite(n) || n <= 0) throw new Error('Enter a price above $0.');
  if (n > MAX_PRICE) throw new Error(`Prices over $${MAX_PRICE.toLocaleString('en-US')} are not allowed.`);
  return Math.round(n * 100) / 100;
}

// `when` is a local date-time string like 2026-11-07T09:00 (what <input type="datetime-local"> gives).
export function parseWhen(v) {
  const s = clean(v);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) throw new Error('Pick a day and time for the job.');
  return s;
}

export function applyQuote(req, { price, when, note, now }) {
  if (req.status !== 'new' && req.status !== 'quoted') throw new Error(`Can't send a price for a request that is ${STATUS_LABEL[req.status].toLowerCase()}.`);
  const quote = { price: parsePrice(price), when: parseWhen(when), note: clean(note) };
  return { ...req, status: 'quoted', quote, history: [...req.history, { at: now, what: `Price sent: ${money(quote.price)}` }] };
}

export function applyAccept(req, { now }) {
  if (req.status !== 'quoted' || !req.quote) throw new Error('This quote can no longer be accepted.');
  return { ...req, status: 'accepted', history: [...req.history, { at: now, what: 'Customer accepted' }] };
}

export function applyDone(req, { now }) {
  if (req.status !== 'accepted') throw new Error('Only booked jobs can be marked done.');
  return { ...req, status: 'done', history: [...req.history, { at: now, what: 'Job done' }] };
}

export function applyDecline(req, { now }) {
  if (req.status !== 'new' && req.status !== 'quoted') throw new Error('Only open requests can be declined.');
  return { ...req, status: 'declined', history: [...req.history, { at: now, what: 'Declined' }] };
}

const ORDER = { new: 0, quoted: 1, accepted: 2, done: 3, declined: 4 };
export function inboxOrder(reqs) {
  return [...reqs].sort((a, b) => ORDER[a.status] - ORDER[b.status] || String(b.createdAt).localeCompare(String(a.createdAt)));
}

// Booked or finished jobs on one day (YYYY-MM-DD), earliest first.
export function jobsForDay(reqs, day) {
  return reqs
    .filter(r => (r.status === 'accepted' || r.status === 'done') && r.quote && r.quote.when.slice(0, 10) === day)
    .sort((a, b) => a.quote.when.localeCompare(b.quote.when));
}

export function dayTotal(jobs) {
  return Math.round(jobs.reduce((t, r) => t + (r.quote ? r.quote.price : 0), 0) * 100) / 100;
}

export function money(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}

// "Sat, Nov 7, 9:00 AM" from 2026-11-07T09:00, without time-zone shifts.
export function prettyWhen(when) {
  const [d, t] = when.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [h, min] = t.split(':').map(Number);
  const date = new Date(Date.UTC(y, m - 1, day));
  const wk = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const mo = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const hh = ((h + 11) % 12) + 1;
  return `${wk}, ${mo} ${day}, ${hh}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function localDay(date = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function mapsLink(address) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
}

// Monday-first week containing `day` (YYYY-MM-DD): 7 days, each with its booked jobs.
export function weekOf(reqs, day) {
  const [y, m, d] = day.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  const monday = new Date(y, m - 1, d - ((base.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const date = localDay(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
    const jobs = jobsForDay(reqs, date);
    return { date, jobs, total: dayTotal(jobs) };
  });
}

export function shiftDay(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

// ---------- Availability ----------
// hours: { mon: ['08:00', '17:00'] | null, ... }  null = closed that day.
// blocks: [{ id, date: 'YYYY-MM-DD', start?: 'HH:MM', end?: 'HH:MM', note? }]  no start/end = whole day off.
export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const WEEKDAY_NAMES = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };
export const DEFAULT_HOURS = { sun: null, mon: ['08:00', '17:00'], tue: ['08:00', '17:00'], wed: ['08:00', '17:00'], thu: ['08:00', '17:00'], fri: ['08:00', '17:00'], sat: ['09:00', '14:00'] };
export const JOB_MINUTES = 60; // two jobs closer than this count as a clash

const isTime = t => /^\d{2}:\d{2}$/.test(t || '');
const mins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
function weekdayOf(day) { const [y, m, d] = day.split('-').map(Number); return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]; }

export function hoursOf(settings) { return { ...DEFAULT_HOURS, ...(settings && settings.hours) }; }

export function validateBlock(b) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) throw new Error('Pick a day to block.');
  const whole = !b.start && !b.end;
  if (!whole) {
    if (!isTime(b.start) || !isTime(b.end)) throw new Error('Pick a start and end time, or block the whole day.');
    if (mins(b.end) <= mins(b.start)) throw new Error('The end time must be after the start time.');
  }
  return { id: b.id, date: b.date, ...(whole ? {} : { start: b.start, end: b.end }), ...(b.note ? { note: String(b.note).trim().slice(0, 80) } : {}) };
}

export function blocksOn(settings, day) { return ((settings && settings.blocks) || []).filter(b => b.date === day); }

// Is this day open for work at all (has hours and is not blocked all day)?
export function isOpenDay(settings, day) {
  if (!hoursOf(settings)[weekdayOf(day)]) return false;
  return !blocksOn(settings, day).some(b => !b.start);
}

// The next `n` days from `from` (inclusive) that are open.
export function openDays(settings, from, n = 14) {
  const out = [];
  for (let i = 0; i < n; i++) { const d = shiftDay(from, i); if (isOpenDay(settings, d)) out.push(d); }
  return out;
}

// Problems with putting a job at `when` (YYYY-MM-DDTHH:MM). Empty list = fine.
export function clashes(settings, reqs, when, selfId) {
  const day = when.slice(0, 10), t = mins(when.slice(11, 16));
  const out = [];
  const h = hoursOf(settings)[weekdayOf(day)];
  if (!h) out.push(`You're closed on ${WEEKDAY_NAMES[weekdayOf(day)]}s.`);
  else if (t < mins(h[0]) || t >= mins(h[1])) out.push(`That's outside your hours (${prettyTime(h[0])} to ${prettyTime(h[1])}).`);
  for (const b of blocksOn(settings, day)) {
    if (!b.start) out.push(`That day is blocked off${b.note ? ` (${b.note})` : ''}.`);
    else if (t >= mins(b.start) && t < mins(b.end)) out.push(`That time is blocked off${b.note ? ` (${b.note})` : ''}.`);
  }
  for (const r of reqs) {
    if (r.id === selfId || !r.quote || (r.status !== 'accepted' && r.status !== 'quoted')) continue;
    if (r.quote.when.slice(0, 10) !== day) continue;
    if (Math.abs(mins(r.quote.when.slice(11, 16)) - t) < JOB_MINUTES) out.push(`Close to ${r.name.split(' ')[0]}'s job at ${prettyTime(r.quote.when.slice(11, 16))}.`);
  }
  return out;
}

export function prettyTime(t) { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; }
export function prettyDay(day) { return prettyWhen(day + 'T00:00').split(', ').slice(0, 2).join(', '); }
