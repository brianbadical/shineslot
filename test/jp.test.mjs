import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const L = createRequire(import.meta.url)('../jp/logic.js');

test('set code is found whatever the case or dashes', () => {
  const ids = ['SV2a', 'SV-P', 'S12a', 'SM12a'];
  assert.equal(L.findSetId('sv2a', ids), 'SV2a');
  assert.equal(L.findSetId(' SV2A ', ids), 'SV2a');
  assert.equal(L.findSetId('svp', ids), 'SV-P');
  assert.equal(L.findSetId('xx9', ids), null);
});

test('card number: slash, hash and leading zeros', () => {
  const ids = ['001', '007', '173', 'TG05'];
  assert.equal(L.findLocalId('173/165', ids), '173');
  assert.equal(L.findLocalId('#7', ids), '007');
  assert.equal(L.findLocalId('tg05', ids), 'TG05');
  assert.equal(L.findLocalId('999', ids), null);
});

test('English match ranking prefers same era, rarity and number', () => {
  const jp = { serie: 'SV', rarity: 'Illustration rare', localId: '173' };
  const en = [
    { id: 'swsh1-50', localId: '50', rarity: 'Rare' },
    { id: 'sv03.5-173', localId: '173', rarity: 'Illustration rare', set: { id: 'sv03.5' } },
    { id: 'sv01-10', localId: '10', rarity: 'Common', set: { id: 'sv01' } },
  ];
  assert.deepEqual(L.rankMatches(jp, en).map(c => c.id), ['sv03.5-173', 'sv01-10', 'swsh1-50']);
});

test('prices from TCGdex pricing', () => {
  const p = { tcgplayer: { unit: 'USD', holofoil: { productId: 513721, marketPrice: 48.96 } }, cardmarket: { trend: 23.76, avg30: 28.47 } };
  assert.deepEqual(L.usdMarket(p), { usd: 48.96, kind: 'holofoil', productId: 513721 });
  assert.equal(L.eurTrend(p), 23.76);
  assert.equal(L.usdMarket({ tcgplayer: null }), null);
  assert.equal(L.money(48.96), '$48.96');
  assert.equal(L.money(1234.5), '$1,235');
  assert.equal(L.money(23.76, 'EUR'), '€23.76');
});

test('English name keeps the ex ending of the Japanese card', () => {
  assert.equal(L.englishName('Venusaur', 'フシギバナex'), 'Venusaur ex');
  assert.equal(L.englishName('Venusaur ex', 'フシギバナ'), 'Venusaur');
  assert.equal(L.englishName('Pikachu', 'ピカチュウ'), 'Pikachu');
});

test('search words and links', () => {
  const q = L.jpQuery('Pikachu', { localId: '173', official: 165, setId: 'SV2a' });
  assert.equal(q, 'Pikachu 173/165 japanese SV2a');
  assert.match(L.soldLink(q), /LH_Sold=1/);
  assert.match(L.soldLink(q), /Pikachu%20173%2F165/);
});
