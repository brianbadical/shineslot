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

test('deal check: shop yen price against US value', () => {
  const d = L.dealCheck('8,980', 150, [null, { usd: 95, label: 'English' }]);
  assert.equal(d.level, 'good'); assert.equal(Math.round(d.tagUsd * 100) / 100, 59.87); assert.equal(d.ref.label, 'English');
  assert.equal(L.dealCheck(14000, 150, [{ usd: 95 }]).level, 'fair');
  assert.equal(L.dealCheck(49980, 150, [{ usd: 120 }]).level, 'high');
  assert.equal(L.dealCheck(5000, 150, []).level, 'none');
  assert.equal(L.dealCheck('', 150, [{ usd: 10 }]).level, 'none');
  assert.equal(L.yen('49980'), '¥49,980');
  const order = L.caseOrder([{ deal: { ratio: 1.4 } }, { deal: { ratio: null } }, { deal: { ratio: 0.5 } }]).map(x => x.deal.ratio);
  assert.deepEqual(order, [0.5, 1.4, null]);
});

test('old set names and the narrow-down box', () => {
  assert.equal(L.cardLabel('PMCG6-035'), 'Challenge from the Darkness 035');
  assert.equal(L.cardLabel('SV2a-173'), 'SV2a 173');
  assert.equal(L.cardLabel('SV-P-001'), 'SV-P 001');
  const cards = [{ id: 'PMCG6-035', name: 'カツラのファイヤー' }, { id: 'SV2a-146', name: 'ファイヤー' }];
  assert.equal(L.filterCards(cards, 'darkness').length, 1);
  assert.equal(L.usdMarket({ tcgplayer: { '1st-edition-holofoil': { marketPrice: 243 }, 'unlimited-holofoil': { marketPrice: 136 } } }).usd, 136);
  assert.equal(L.filterCards(cards, 'カツラ')[0].id, 'PMCG6-035');
  assert.equal(L.filterCards(cards, '').length, 2);
});
