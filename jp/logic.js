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
    const order = ['holofoil', 'normal', 'reverse-holofoil', 'reverseHolofoil', '1st-edition-holofoil', '1stEditionHolofoil', 'unlimited-holofoil', 'unlimitedHolofoil'];
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

  const api = { findSetId, cleanNumber, findLocalId, seriesPrefix, rankMatches, usdMarket, eurTrend, money, soldLink, pcLink, jpQuery, enQuery, englishName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.JPLogic = api;
})(this);
