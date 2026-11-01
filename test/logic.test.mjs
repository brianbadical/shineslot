import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest, makeRequest, applyQuote, applyAccept, applyDone, applyDecline, parsePrice, inboxOrder, jobsForDay, dayTotal, money, prettyWhen, tradeOf, TRADES } from '../logic.js';
import { LocalStore } from '../store.js';
import { sampleRequests } from '../sample.js';

const good = { name: 'Ann', phone: '555-123-4567', vehicle: '2019 CR-V', services: ['Interior'], address: '1 Main St' };
const now = '2026-11-01T12:00:00.000Z';

test('a complete request passes, a blank one lists every problem', () => {
  assert.deepEqual(validateRequest(good), []);
  assert.equal(validateRequest({}).length, 5);
  assert.match(validateRequest({ ...good, phone: '', email: 'bad' }).join(' '), /email/);
});

test('request flows new -> quoted -> accepted -> done', () => {
  let r = makeRequest(good, { id: 'a', now });
  assert.equal(r.status, 'new');
  assert.throws(() => applyAccept(r, { now }));
  r = applyQuote(r, { price: '$150', when: '2026-11-07T09:00', note: ' ok ', now });
  assert.deepEqual(r.quote, { price: 150, when: '2026-11-07T09:00', note: 'ok' });
  r = applyQuote(r, { price: 160, when: '2026-11-07T10:00', now }); // price can be updated before acceptance
  r = applyAccept(r, { now });
  assert.equal(r.status, 'accepted');
  assert.throws(() => applyQuote(r, { price: 1, when: '2026-11-07T10:00', now }));
  assert.throws(() => applyDecline(r, { now }));
  r = applyDone(r, { now });
  assert.equal(r.status, 'done');
  assert.equal(r.history.length, 5);
});

test('bad prices and times are refused', () => {
  assert.throws(() => parsePrice('0'));
  assert.throws(() => parsePrice('abc'));
  assert.throws(() => parsePrice(20000));
  assert.equal(parsePrice('1,250.5'), 1250.5);
  const r = makeRequest(good, { id: 'a', now });
  assert.throws(() => applyQuote(r, { price: 50, when: 'tomorrow', now }));
});

test('inbox puts new first; today list is sorted with a total', () => {
  const mk = (id, t) => makeRequest(good, { id, now: t });
  const a = mk('a', '2026-11-01T01:00:00Z');
  const b = applyQuote(mk('b', '2026-11-01T02:00:00Z'), { price: 80, when: '2026-11-07T13:00', now });
  const c = applyAccept(applyQuote(mk('c', now), { price: 150, when: '2026-11-07T09:00', now }), { now });
  const d = applyAccept(applyQuote(mk('d', now), { price: 99.5, when: '2026-11-07T08:00', now }), { now });
  assert.deepEqual(inboxOrder([c, b, a]).map(x => x.id), ['a', 'b', 'c']);
  const jobs = jobsForDay([a, b, c, d], '2026-11-07');
  assert.deepEqual(jobs.map(x => x.id), ['d', 'c']);
  assert.equal(dayTotal(jobs), 249.5);
  assert.equal(money(249.5), '$249.50');
  assert.equal(money(150), '$150');
});

test('dates print without time-zone shifts', () => {
  assert.equal(prettyWhen('2026-11-07T09:00'), 'Sat, Nov 7, 9:00 AM');
  assert.equal(prettyWhen('2026-11-07T00:05'), 'Sat, Nov 7, 12:05 AM');
  assert.equal(prettyWhen('2026-11-07T13:30'), 'Sat, Nov 7, 1:30 PM');
});

test('trades swap wording; unknown trade falls back to detailing', () => {
  assert.equal(tradeOf('mechanic'), TRADES.mechanic);
  assert.equal(tradeOf('nope'), TRADES.detailing);
});

test('local store saves and updates requests, sample data is valid', async () => {
  const mem = new Map();
  const store = new LocalStore({ getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) });
  for (const trade of ['detailing', 'mechanic']) {
    await store.reset();
    for (const r of sampleRequests(new Date('2026-11-01T15:00:00'), trade)) await store.putRequest(r);
    const all = await store.listRequests();
    assert.deepEqual(all.map(r => r.status), ['new', 'quoted', 'accepted']);
    await store.putRequest({ ...all[0], name: 'Changed' });
    assert.equal((await store.getRequest(all[0].id)).name, 'Changed');
    assert.equal((await store.listRequests()).length, 3);
  }
  await store.saveSettings({ trade: 'mechanic' });
  assert.equal((await store.getSettings()).trade, 'mechanic');
});

test('garage trade does not need an address; week view groups jobs Monday-first', async () => {
  const { weekOf, shiftDay } = await import('../logic.js');
  const noAddr = { ...good, address: '' };
  assert.equal(validateRequest(noAddr, 'detailing').length, 1);
  assert.deepEqual(validateRequest(noAddr, 'mechanic'), []);
  const r = applyAccept(applyQuote(makeRequest(noAddr, { id: 'm', now, trade: 'mechanic' }), { price: 65, when: '2026-11-05T10:00', now }), { now });
  const week = weekOf([r], '2026-11-07'); // a Saturday
  assert.equal(week[0].date, '2026-11-02'); // Monday
  assert.equal(week[6].date, '2026-11-08');
  assert.equal(week[3].jobs.length, 1);
  assert.equal(week[3].total, 65);
  assert.equal(shiftDay('2026-11-30', 1), '2026-12-01');
  assert.equal(weekOf([], '2026-11-02')[0].date, '2026-11-02');
});

test('link names are cleaned up', async () => {
  const { slugify } = await import('../cloud.js');
  assert.equal(slugify("Joe's Mobile Detailing!"), 'joe-s-mobile-detailing');
  assert.equal(slugify('  Bob  '), 'bob');
  assert.equal(slugify('AB'), 'ab-shop');
  assert.match(slugify('x'.repeat(80)), /^x{40}$/);
});

test('demo store hands customers a token and accepts by token', async () => {
  const mem = new Map();
  const store = new LocalStore({ getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) });
  const req = makeRequest(good, { id: 'abc', now });
  const token = await store.submitRequest('demo', req);
  assert.equal(token, 'abc');
  await store.putRequest(applyQuote(await store.getRequest('abc'), { price: 90, when: '2026-11-07T09:00', now }));
  await store.acceptQuote(token, applyAccept);
  assert.equal((await store.getQuote(token)).request.status, 'accepted');
  assert.equal(await store.getQuote('nope'), null);
});

test('cleaning trade asks about the home and needs an address', async () => {
  const home = { name: 'Ann', phone: '555-123-4567', vehicle: '', services: ['Deep clean'], address: '' };
  const errs = validateRequest(home, 'cleaning').join(' ');
  assert.match(errs, /Bedrooms/);
  assert.match(errs, /address/);
  assert.deepEqual(validateRequest({ ...home, details: { homeType: 'House', beds: '3', baths: '2' }, address: '1 Main' }, 'cleaning'), []);
  assert.equal(TRADES.cleaning.atShop, false);
  const rows = sampleRequests(new Date('2026-11-01T15:00:00'), 'cleaning');
  assert.equal(rows.length, 3);
  assert.match(rows[0].vehicle, /bath/);
});

test('availability: hours, blocks, open days and clashes', async () => {
  const { openDays, isOpenDay, clashes, validateBlock, prettyTime } = await import('../logic.js');
  const s = { hours: { sun: null, sat: null }, blocks: [validateBlock({ id: 'b1', date: '2026-11-04' }), validateBlock({ id: 'b2', date: '2026-11-05', start: '12:00', end: '14:00', note: 'Dentist' })] };
  // 2026-11-02 is a Monday
  assert.equal(isOpenDay(s, '2026-11-02'), true);
  assert.equal(isOpenDay(s, '2026-11-04'), false); // whole day blocked
  assert.equal(isOpenDay(s, '2026-11-05'), true);  // only part blocked
  assert.equal(isOpenDay(s, '2026-11-07'), false); // Saturday closed
  assert.deepEqual(openDays(s, '2026-11-02', 7), ['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06']);
  assert.deepEqual(clashes(s, [], '2026-11-02T09:00'), []);
  assert.match(clashes(s, [], '2026-11-02T18:00')[0], /outside your hours/);
  assert.match(clashes(s, [], '2026-11-08T10:00')[0], /closed on Sundays/);
  assert.match(clashes(s, [], '2026-11-05T12:30')[0], /blocked off \(Dentist\)/);
  assert.match(clashes(s, [], '2026-11-04T10:00').join(), /day is blocked/);
  const other = { id: 'x', name: 'Ann Lee', status: 'accepted', quote: { when: '2026-11-03T10:00', price: 1 } };
  assert.match(clashes(s, [other], '2026-11-03T10:30')[0], /Ann's job at 10:00 AM/);
  assert.deepEqual(clashes(s, [other], '2026-11-03T11:00'), []);
  assert.deepEqual(clashes(s, [other], '2026-11-03T10:00', 'x'), []); // itself
  assert.throws(() => validateBlock({ date: '2026-11-05', start: '14:00', end: '12:00' }));
  assert.throws(() => validateBlock({ date: 'soon' }));
  assert.equal(prettyTime('13:05'), '1:05 PM');
});

test('cleaning intake answers: required home basics, answers kept clean, place line built', async () => {
  const { cleanDetails, detailLines } = await import('../logic.js');
  const base = { name: 'Sel', phone: '555-123-4567', services: ['Deep clean'], address: '1 Main St' };
  assert.match(validateRequest(base, 'cleaning').join(' '), /Type of home/);
  const details = { homeType: 'House', beds: '3', baths: '2.5', sqft: '1,800', floors: ['Tile', 'Lava'], score: '11', budget: '  $150  ', junk: 'x' };
  assert.deepEqual(validateRequest({ ...base, details }, 'cleaning'), []);
  const r = makeRequest({ ...base, details }, { id: 'c', now, trade: 'cleaning' });
  assert.equal(r.vehicle, '3 bed, 2.5 bath house · 1,800 sq ft');
  assert.deepEqual(r.details, { homeType: 'House', beds: '3', baths: '2.5', sqft: '1,800', floors: ['Tile'], budget: '$150' });
  assert.deepEqual(cleanDetails({ beds: '2' }, 'detailing'), {});
  assert.deepEqual(detailLines(r.details, 'cleaning')[0], ['Type of home', 'House']);
  const studio = makeRequest({ ...base, details: { homeType: 'Apartment', beds: 'Studio', baths: '1' } }, { id: 'd', now, trade: 'cleaning' });
  assert.equal(studio.vehicle, 'Studio, 1 bath apartment');
});

test('sizes with starting prices', async () => {
  const { parseSizes, sizesText, sizeTag } = await import('../logic.js');
  const { sizes, errors } = parseSizes('Car = 120\nSmall SUV: $140\n\nLarge SUV / pickup - 170+');
  assert.deepEqual(errors, []);
  assert.equal(sizes.length, 3);
  assert.equal(sizeTag(sizes[2]), 'Large SUV / pickup · $170+');
  assert.deepEqual(parseSizes(sizesText(sizes)).sizes, sizes);
  assert.equal(parseSizes('Car\nBoat = 0').errors.length, 2);
  const r = makeRequest({ ...good, size: sizes[1] }, { id: 's', now });
  assert.equal(r.size, 'Small SUV · $140');
  assert.equal(r.sizePrice, 140);
});

test('window tint trade: free-text item plus optional questions', async () => {
  const { cleanDetails } = await import('../logic.js');
  assert.equal(TRADES.tint.name, 'Window tint');
  const req = { name: 'Tia', phone: '555-123-4567', vehicle: '2021 Civic', services: ['Full car (sides and back)'], address: '9 Oak' };
  assert.deepEqual(validateRequest(req, 'tint'), []);
  assert.match(validateRequest({ ...req, vehicle: '' }, 'tint').join(' '), /tinting/);
  const r = makeRequest({ ...req, details: { shade: '20%', goal: ['Heat', 'Nope'] } }, { id: 't', now, trade: 'tint' });
  assert.deepEqual(r.details, { shade: '20%', goal: ['Heat'] });
  assert.deepEqual(cleanDetails({ shade: '50%' }, 'tint'), {});
});

test('getting paid: pay settings, links, mark paid, earnings', async () => {
  const { validatePay, payLinks, applyPaid, applyUnpaid, earnings } = await import('../logic.js');
  let { pay, errors } = validatePay({ on: true, cashapp: '$SterlShine', venmo: '@sterl-shine', paypal: 'https://paypal.me/sterl/20', cardLink: 'https://square.link/u/abc' });
  assert.deepEqual(errors, []);
  assert.equal(pay.paypal, 'sterl');
  const links = payLinks(pay, 140);
  assert.equal(links[0].label, 'Pay by card');
  assert.equal(links.find(l => l.label === 'Cash App').href, 'https://cash.app/$SterlShine/140');
  assert.deepEqual(payLinks({ ...pay, on: false }, 140), []);
  assert.equal(validatePay({ on: true }).errors.length, 1);
  assert.equal(validatePay({ cardLink: 'javascript:alert(1)' }).errors.length, 1);
  let r = applyAccept(applyQuote(makeRequest(good, { id: 'p', now }), { price: 140, when: '2026-11-02T09:00', now }), { now });
  assert.throws(() => applyPaid(makeRequest(good, { id: 'q', now }), { amount: 10, method: 'Cash', now }));
  const e0 = earnings([r], '2026-11-05');
  assert.deepEqual([e0.owed, e0.owedCount], [140, 1]);
  r = applyPaid(r, { amount: '140', tip: '20', method: 'Cash App', now: '2026-11-04T15:00:00' });
  const e = earnings([r], '2026-11-05');
  assert.deepEqual([e.week, e.month, e.year, e.tips, e.owedCount], [160, 160, 160, 20, 0]);
  assert.equal(earnings([r], '2026-11-12').week, 0);
  assert.equal(applyUnpaid(r, { now }).paid, null);
});

test('owners can set their own tick-box choices', async () => {
  const { servicesOf, parseChoices } = await import('../logic.js');
  assert.deepEqual(servicesOf({ trade: 'detailing' }), TRADES.detailing.services);
  assert.deepEqual(servicesOf({ trade: 'detailing', services: ['Interior', 'Exterior'] }), ['Interior', 'Exterior']);
  assert.deepEqual(servicesOf({ trade: 'detailing', services: [] }), TRADES.detailing.services);
  assert.deepEqual(parseChoices(' Interior \n\nInterior\nExterior').choices, ['Interior', 'Exterior']);
  assert.equal(parseChoices('').errors.length, 1);
});

test('every starter template works end to end', () => {
  for (const [key, t] of Object.entries(TRADES)) {
    for (const f of ['name', 'defaultBusiness', 'tagline', 'worker', 'itemLabel', 'itemHint', 'servicesLabel', 'notesLabel', 'notesHint', 'photosLabel', 'intro', 'noteHint']) assert.ok(t[f], `${key} is missing ${f}`);
    assert.ok(t.services.length >= 5, key);
    const rows = sampleRequests(new Date('2026-11-01T15:00:00'), key);
    assert.equal(rows.length, 3, key);
  }
  assert.ok(Object.keys(TRADES).length >= 14);
  assert.match(validateRequest({ name: 'A', phone: '555-123-4567', vehicle: 'x', services: ['Mowing'] }, 'lawn').join(' '), /Add the address/);
});
