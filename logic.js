// ShineSlot rules: plain functions with no browser or storage code, so they can be tested in Node.

// One app, several trades. Each trade only changes wording and the list of choices.
export const TRADES = {
  detailing: {
    name: 'Detailing',
    defaultBusiness: 'Your Detailing',
    tagline: 'Mobile detailing',
    worker: 'the detailer',
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
    servicesLabel: 'What does it need?',
    services: ['Oil change', 'Brakes', 'Check engine light', 'Battery or starting', 'Noise or vibration', 'AC or heat', 'Tune-up', 'Not sure'],
    notesLabel: "What's going on with it?",
    notesHint: 'Sounds, warning lights, when it started, mileage...',
    photosLabel: 'Photos (dash lights, the problem area)',
    intro: "Tell me about your car and what's wrong. I will send you a price and a time.",
    noteHint: 'For example: parts and labor, about 2 hours',
    atShop: true, // customers bring the car to the garage, so no address is asked
  },
};
export const tradeOf = key => TRADES[key] || TRADES.detailing;
export const SERVICES = TRADES.detailing.services;
export const TIMES = ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Saturday', 'Sunday'];
export const MAX_PRICE = 10000;
export const MAX_PHOTOS = 4;

// new -> quoted -> accepted -> done. The detailer can decline a new or quoted request.
export const STATUS_LABEL = { new: 'New request', quoted: 'Price sent', accepted: 'Booked', done: 'Done', declined: 'Declined' };

const clean = v => String(v ?? '').trim();

export function validateRequest(input, trade = 'detailing') {
  const errors = [];
  if (!clean(input.name)) errors.push('Add your name.');
  const phone = clean(input.phone), email = clean(input.email);
  if (!phone && !email) errors.push('Add a phone number or email so we can reply.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('That email does not look right.');
  if (phone && phone.replace(/\D/g, '').length < 7) errors.push('That phone number looks too short.');
  if (!clean(input.vehicle)) errors.push('Add the vehicle (for example 2019 Honda CR-V).');
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
