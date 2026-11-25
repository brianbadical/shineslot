// Japanese Card Converter: pure helpers (no network, no page). Tested by test/jp.test.mjs.
(function (root) {
  // "sv2a" -> the set id as TCGdex spells it ("SV2a"). Returns null when no set matches.
  function findSetId(input, setIds) {
    const want = String(input || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!want) return null;
    const exact = setIds.find(id => id.toLowerCase() === want);
    if (exact) return exact;
    const loose = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    return setIds.find(id => loose(id) === loose(want)) || null;
  }

  // "173/165", "#173", "173" -> "173". Keeps letters for promo numbers like "SV-P 001" or "TG05".
  function cleanNumber(input) {
    let s = String(input || '').trim();
    if (s.includes('/')) s = s.split('/')[0];
    return s.replace(/^#/, '').replace(/\s+/g, '').trim();
  }

  // Pick the card in a set whose number matches what was typed ("7" finds "007").
  function findLocalId(input, localIds) {
    const n = cleanNumber(input);
    if (!n) return null;
    const exact = localIds.find(l => l.toLowerCase() === n.toLowerCase());
    if (exact) return exact;
    if (/^\d+$/.test(n)) return localIds.find(l => /^\d+$/.test(l) && Number(l) === Number(n)) || null;
    return null;
  }

  // Japanese series id ("SV", "S", "SM", "XY", "BW") -> the English set id prefix.
  const SERIES = { SV: 'sv', S: 'swsh', SM: 'sm', XY: 'xy', BW: 'bw', M: 'me' };
  function seriesPrefix(jpSerieId) { return SERIES[String(jpSerieId || '').toUpperCase()] || null; }

  // Rank English cards that might be the same picture as the Japanese card. Best first.
  // en: [{id, localId, name, rarity?, set?{id}}]
  function rankMatches(jp, en) {
    const prefix = seriesPrefix(jp.serie);
    const score = c => {
      let s = 0;
      const setId = (c.set && c.set.id) || String(c.id).split('-').slice(0, -1).join('-');
      if (prefix && setId.toLowerCase().startsWith(prefix)) s += 4;
      if (jp.rarity && c.rarity && jp.rarity.toLowerCase() === c.rarity.toLowerCase()) s += 2;
      if (jp.localId && Number(c.localId) === Number(jp.localId)) s += 1;
      return s;
    };
    return en.map(c => ({ c, s: score(c) })).sort((a, b) => b.s - a.s).map(x => x.c);
  }

  // Prices the app shows. TCGdex pricing: { tcgplayer: {unit:'USD', <variant>: {marketPrice,...}}, cardmarket: {trend, avg30, unit:'EUR'} }
  function usdMarket(pricing) {
    const t = pricing && pricing.tcgplayer;
    if (!t) return null;
    // Unlimited before 1st edition: shop copies are rarely 1st edition, and its price is much higher
    const order = ['holofoil', 'normal', 'unlimited-holofoil', 'unlimitedHolofoil', 'unlimited', 'reverse-holofoil', 'reverseHolofoil', '1st-edition-holofoil', '1stEditionHolofoil', '1st-edition', '1stEdition'];
    const keys = order.filter(k => t[k]).concat(Object.keys(t).filter(k => t[k] && typeof t[k] === 'object' && !order.includes(k)));
    for (const k of keys) { const v = t[k].marketPrice || t[k].midPrice || t[k].lowPrice; if (v) return { usd: v, kind: k, productId: t[k].productId }; }
    return null;
  }
  function eurTrend(pricing) {
    const c = pricing && pricing.cardmarket;
    if (!c) return null;
    const v = c.trend || c.avg30 || c.avg7 || c.avg || c['trend-holo'] || c['avg30-holo'];
    return v ? v : null;
  }
  function money(v, cur) {
    if (v == null) return '—';
    const sign = cur === 'EUR' ? '€' : '$';
    return sign + (v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2));
  }

  function soldLink(q) { return 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(q) + '&LH_Sold=1&LH_Complete=1'; }
  function pcLink(q) { return 'https://www.pricecharting.com/search-products?type=prices&q=' + encodeURIComponent(q); }

  // Search words for one card: "Pikachu 173/165 japanese SV2a"
  function jpQuery(enName, jp) {
    const num = jp.official ? jp.localId + '/' + jp.official : jp.localId;
    return [enName || '', num, 'japanese', jp.setId].filter(Boolean).join(' ');
  }
  function enQuery(en) {
    const num = en.official ? en.localId + '/' + en.official : en.localId;
    return [en.name, num, en.setName].filter(Boolean).join(' ');
  }

  // "Venusaur ex" from English plus "フシギバナex" -> keep the ex/V/GX ending the Japanese card has.
  function englishName(baseName, jpName) {
    if (!baseName) return '';
    const base = baseName.replace(/\s+(ex|EX|GX|V|VMAX|VSTAR|V-UNION|BREAK|LV\.X|δ)$/,'').replace(/^(Mega|M)\s+/,'');
    const m = String(jpName || '').match(/(ex|EX|GX|VMAX|VSTAR|V|BREAK)$/);
    const mega = /^(メガ|M)/.test(String(jpName || ''));
    return (mega ? 'Mega ' : '') + base + (m ? ' ' + m[1] : '');
  }

  // Is the shop's ¥ price a good deal? refs: [{usd, label}] in order of trust; the first with a price is used.
  function dealCheck(yen, yenPerUsd, refs) {
    const y = Number(String(yen == null ? '' : yen).replace(/[^0-9.]/g, ''));
    const rate = Number(yenPerUsd) || 150;
    const tagUsd = y > 0 ? y / rate : null;
    const ref = (refs || []).find(r => r && r.usd > 0) || null;
    if (!tagUsd || !ref) return { tagUsd, ref, ratio: null, level: 'none' };
    const ratio = tagUsd / ref.usd;
    return { tagUsd, ref, ratio, level: ratio <= 0.8 ? 'good' : ratio <= 1.1 ? 'fair' : 'high' };
  }
  function yen(v) { const n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return n ? '¥' + Math.round(n).toLocaleString('en-US') : '—'; }
  // Best deals first; cards with no price at the end.
  function caseOrder(items) {
    return items.slice().sort((a, b) => (a.deal && a.deal.ratio != null ? a.deal.ratio : 99) - (b.deal && b.deal.ratio != null ? b.deal.ratio : 99));
  }

  // English names for the old Japanese sets (their codes aren't printed on the cards)
  const OLD_SETS = { PMCG1: 'Expansion Pack', PMCG2: 'Jungle', PMCG3: 'Mystery of the Fossils', PMCG4: 'Rocket Gang', PMCG5: "Leaders' Stadium", PMCG6: 'Challenge from the Darkness',
    neo1: 'Neo 1', neo2: 'Neo 2', neo3: 'Neo 3', neo4: 'Neo 4', VS1: 'VS', web1: 'Web', E1: 'e-Card 1', E2: 'e-Card 2', E3: 'e-Card 3', E4: 'e-Card 4', E5: 'e-Card 5' };
  // "PMCG6-035" -> "Gym Challenge 035", "SV2a-173" -> "SV2a 173"
  function cardLabel(id) {
    const i = String(id).lastIndexOf('-'), set = String(id).slice(0, i), num = String(id).slice(i + 1);
    return (OLD_SETS[set] || set) + ' ' + num;
  }
  // Keep the tiles whose set, number or name has what was typed
  function filterCards(cards, q) {
    const w = String(q || '').trim().toLowerCase();
    if (!w) return cards;
    return cards.filter(c => (c.id + ' ' + cardLabel(c.id) + ' ' + (c.name || '')).toLowerCase().includes(w));
  }

  // Claude's auto-scan reply -> {cards, unreadable}. Reads the last ```json block. null when it can't.
  function parseScan(text) {
    const blocks = String(text || '').match(/```(?:json)?\s*([\s\S]*?)```/g);
    const raw = blocks ? blocks[blocks.length - 1].replace(/^```(?:json)?\s*/, '').replace(/```$/, '') : String(text || '');
    let o; try { o = JSON.parse(raw.trim()); } catch (e) { return null; }
    if (!o || !Array.isArray(o.cards)) return null;
    const num = v => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return n > 0 ? n : null; };
    const cards = o.cards.filter(c => c && typeof c === 'object').map(c => ({
      name: String(c.name || ''), set: String(c.set || ''), number: String(c.number || ''), tag_yen: num(c.tag_yen),
      condition: String(c.condition || ''), where: String(c.where || ''), count: Math.max(1, Math.round(num(c.count) || 1)),
      usd: num(c.usd), source: String(c.source || ''), url: String(c.url || ''), sure: c.sure !== false, note: String(c.note || ''),
    }));
    return { cards, unreadable: Math.max(0, Math.round(Number(o.unreadable) || 0)) };
  }
  // Deal check for each auto-scan card, best deals first, no price last
  function rankScan(cards, rate) {
    return caseOrder((cards || []).map(card => ({ card, deal: dealCheck(card.tag_yen, rate, card.usd ? [{ usd: card.usd, label: 'Japanese card' }] : []) })));
  }

  const api = { findSetId, cleanNumber, findLocalId, seriesPrefix, rankMatches, usdMarket, eurTrend, money, soldLink, pcLink, jpQuery, enQuery, englishName, dealCheck, yen, caseOrder, cardLabel, filterCards, parseScan, rankScan };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.JPLogic = api;
})(this);
