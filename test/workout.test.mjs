import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const WL = createRequire(import.meta.url)('../workout/logic.js');

test('starter plans build with ids', () => {
  for (const s of WL.STARTERS) {
    const p = WL.planFrom(s.key);
    assert.ok(p.id && p.days.length >= 2);
    p.days.forEach(d => { assert.ok(d.id); assert.ok(d.ex.length >= 3); });
  }
});

test('next day rotates after the last finished workout', () => {
  const p = WL.planFrom('ppl');
  assert.equal(WL.nextDay(p, []).name, 'Push');
  assert.equal(WL.nextDay(p, [{ planId: p.id, dayId: p.days[0].id, ex: [] }]).name, 'Pull');
  assert.equal(WL.nextDay(p, [{ planId: p.id, dayId: p.days[2].id, ex: [] }]).name, 'Push');
  assert.equal(WL.nextDay(p, [{ planId: 'old', dayId: 'x', ex: [] }]).name, 'Push');
});

const done = (name, w, reps, weight = true) => ({ planId: 'x', dayId: 'y', start: 1, end: 2, ex: [{ name, weight, sets: reps.map(r => ({ w, r, done: true })) }] });

test('coach adds weight only when every rep was hit', () => {
  const e = { name: 'Bench press', sets: 3, reps: 8, weight: true, unit: 'reps' };
  assert.equal(WL.suggest(e, WL.lastFor('bench press', [done('Bench press', '100', [8, 8, 8])])).w, '105');
  assert.equal(WL.suggest(e, WL.lastFor('Bench press', [done('Bench press', '100', [8, 8, 6])])).w, '100');
  assert.equal(WL.suggest({ ...e, name: 'Squat' }, WL.lastFor('Squat', [done('Squat', '185', [8, 8, 8])])).w, '195');
  assert.equal(WL.suggest(e, null).w, '');
});

test('a new workout starts from the coach weight', () => {
  const p = WL.planFrom('gym');
  const w = WL.startWorkout(p, p.days[0], [done('Squat', '135', [8, 8, 8])]);
  assert.equal(w.ex[0].sets.length, 3);
  assert.equal(w.ex[0].sets[0].w, '145');
  assert.equal(w.ex[1].sets[0].w, '');
});

test('summary and weekly stats', () => {
  const w = { start: 0, end: 30 * 60000, ex: [{ weight: true, sets: [{ w: '100', r: '10', done: true }, { w: '100', r: '10', done: false }] }] };
  assert.deepEqual(WL.summary(w), { sets: 1, volume: 1000, mins: 30 });
  const now = new Date(2026, 10, 25, 12).getTime(); // Wed
  const day = 864e5;
  const h = [{ end: now - day, ex: [] }, { end: now - 7 * day, ex: [] }, { end: now - 14 * day, ex: [] }, { end: now - 35 * day, ex: [] }];
  const s = WL.stats(h, now);
  assert.equal(s.thisWeek, 1); assert.equal(s.streak, 3); assert.equal(s.total, 4);
  assert.equal(WL.stats([{ end: now - 7 * day, ex: [] }], now).streak, 1);
});
