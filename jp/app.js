// Japanese Card Converter: type the set code and number from a Japanese Pokémon card,
// see the English print of the same picture and what both sell for.
// Data: TCGdex (free, no key): Japanese + English cards, artists, TCGplayer and Cardmarket prices.
const L = window.JPLogic;
const API = 'https://api.tcgdex.net/v2/';
const EUR_USD = 1.15; // rough euro to dollar rate for the "about $" line; the euro price is the real one
const HIST_KEY = 'jp-hist', SETS_KEY = 'jp-sets';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let tab = 'scan', current = null, nameHits = null;

function load(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
let hist = load(HIST_KEY, []);

function toast(t) { const el = $('#toast'); el.textContent = t; el.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => el.style.display = 'none', 2600); }
// One picture tile. Many old Japanese cards have no picture in the data, so show their Japanese name instead.
function tile(attr, c, label) {
  return '<div ' + attr + '>' + (c.image ? '<img loading="lazy" src="' + esc(img(c.image)) + '" alt="">' : '<div class="noimg">' + esc(c.name || '') + '<small>no picture</small></div>') + '<span>' + esc(label) + '</span></div>';
}
function img(u, size) { return u ? u + '/' + (size || 'low') + '.webp' : 'icon.svg'; }

const memo = {};
async function get(path) {
  if (memo[path]) return memo[path];
  const r = await fetch(API + path);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('lookup ' + r.status);
  return (memo[path] = await r.json());
}

async function getSets() {
  const c = load(SETS_KEY, null);
  if (c && c.at && Date.now() - c.at < 7 * 864e5) return c.sets;
  try { const sets = (await get('ja/sets')).map(s => ({ id: s.id, name: s.name })); store(SETS_KEY, { at: Date.now(), sets }); return sets; }
  catch (e) { if (c) return c.sets; throw e; }
}

// ---------- the look-up ----------
async function byCode(code, num) {
  const sets = await getSets();
  const setId = L.findSetId(code, sets.map(s => s.id));
  if (!setId) throw new Error('No Japanese set with code "' + code + '". Check the small letters at the bottom left of the card.');
  const set = await get('ja/sets/' + encodeURIComponent(setId));
  const localId = L.findLocalId(num, (set.cards || []).map(c => c.localId));
  if (!localId) throw new Error('Set ' + setId + ' has no card number ' + L.cleanNumber(num) + '.');
  return convert(set.cards.find(c => c.localId === localId).id, set);
}

async function convert(jpId, set) {
  const c = await get('ja/cards/' + encodeURIComponent(jpId));
  if (!c) throw new Error('Card not found.');
  if (!set) set = await get('ja/sets/' + encodeURIComponent(c.set.id));
  const jp = {
    id: c.id, setId: c.set.id, setName: c.set.name, serie: set && set.serie && set.serie.id,
    localId: c.localId, official: c.set.cardCount && c.set.cardCount.official, name: c.name,
    rarity: c.rarity && c.rarity !== 'None' ? c.rarity : '', illustrator: c.illustrator || '',
    dexId: (c.dexId || [])[0] || null, category: c.category, trainerType: c.trainerType || '', image: c.image,
    eur: L.eurTrend(c.pricing),
  };
  // English cards with the same Pokémon (or same card type) by the same artist
  let list = [];
  if (jp.illustrator) {
    const q = jp.dexId ? 'dexId=eq:' + jp.dexId : 'category=eq:' + encodeURIComponent(jp.category || 'Trainer');
    list = (await get('en/cards?' + q + '&illustrator=eq:' + encodeURIComponent(jp.illustrator))) || [];
  }
  const top = L.rankMatches(jp, list).slice(0, jp.dexId ? 8 : 18);
  let full = (await Promise.all(top.map(x => get('en/cards/' + encodeURIComponent(x.id)).catch(() => null)))).filter(Boolean);
  // Trainer cards: keep the same kind (Supporter, Item, Stadium...) when we can tell
  if (!jp.dexId && jp.trainerType) { const same = full.filter(e => e.trainerType === jp.trainerType); if (same.length) full = same; }
  const matches = L.rankMatches(jp, full).map(e => ({
    id: e.id, name: e.name, localId: e.localId, rarity: e.rarity, image: e.image,
    setName: e.set && e.set.name, official: e.set && e.set.cardCount && e.set.cardCount.official,
    usd: L.usdMarket(e.pricing), eur: L.eurTrend(e.pricing),
  }));
  let enName = '';
  if (jp.dexId) {
    let base = matches[0] && matches[0].name;
    if (!base) { const any = await get('en/cards?dexId=eq:' + jp.dexId + '&pagination:itemsPerPage=1').catch(() => null); base = any && any[0] && any[0].name; }
    enName = L.englishName(base, jp.name);
  } else if (matches[0]) enName = matches[0].name;
  // Trainer and energy names can't be translated here, so for those you tap the same picture yourself.
  if (!jp.dexId) enName = '';
  const res = { at: new Date().toISOString(), jp, enName, matches, pick: jp.dexId || !matches.length ? 0 : -1, sure: !!jp.dexId && matches.length === 1 };
  hist = [res].concat(hist.filter(h => h.jp.id !== jp.id)).slice(0, 60);
  store(HIST_KEY, hist);
  return res;
}

async function byName(name) {
  const hits = await get('en/cards?name=' + encodeURIComponent(name.trim()) + '&pagination:itemsPerPage=1');
  if (!hits || !hits.length) throw new Error('No Pokémon called "' + name + '". Pokémon names only (not trainers).');
  const one = await get('en/cards/' + encodeURIComponent(hits[0].id));
  const dex = one && (one.dexId || [])[0];
  if (!dex) throw new Error('"' + name + '" is not a Pokémon. Use the set code and number for trainer cards.');
  const jp = (await get('ja/cards?dexId=eq:' + dex)) || [];
  return { name: L.englishName(one.name, ''), cards: jp.slice().reverse() };
}

// ---------- screens ----------
function render() {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const m = $('#main');
  if (tab === 'scan') { m.innerHTML = scanHtml(); wireScan(); return; }
  if (tab === 'history') {
    m.innerHTML = hist.length ? '<p class="hint">Your last ' + hist.length + ' look-ups. They open with no signal.</p>' + hist.map((h, i) => {
      const e = h.matches[h.pick];
      return '<div class="row" data-h="' + i + '"><img src="' + esc(img(h.jp.image)) + '" alt=""><div class="info"><div class="nm">' + esc(h.enName || h.jp.name) + '</div><div class="sub">' + esc(h.jp.setId + ' ' + h.jp.localId) + (e ? ' → ' + esc(e.setName + ' ' + e.localId) : h.pick < 0 ? ' → not picked yet' : ' → Japan only?') + '</div></div><div class="val"><b>' + (e && e.usd ? L.money(e.usd.usd) : '') + '</b><span class="sub">' + (h.jp.eur ? 'JP ' + L.money(h.jp.eur, 'EUR') : '') + '</span></div></div>';
    }).join('') + '<button class="big ghost" id="clr">Clear the list</button>' : '<div class="empty">Cards you look up show here.</div>';
    m.querySelectorAll('[data-h]').forEach(el => el.onclick = () => { current = hist[+el.dataset.h]; tab = 'find'; render(); });
    const clr = $('#clr'); if (clr) clr.onclick = () => { if (clr.dataset.sure) { hist = []; store(HIST_KEY, hist); render(); } else { clr.dataset.sure = 1; clr.textContent = 'Tap again to clear'; } };
    return;
  }
  m.innerHTML = formHtml() + '<div id="out">' + (current ? resultHtml(current) : nameHits ? namesHtml(nameHits) : helpHtml()) + '</div>';
  wireForm();
  wireOut();
}

function formHtml() {
  return '<form id="f" class="quick" autocomplete="off">' +
    '<div class="two"><div><label for="code">Set code</label><input id="code" list="setlist" placeholder="SV2a" autocapitalize="characters" value="' + esc(current ? current.jp.setId : '') + '"></div>' +
    '<div><label for="num">Card number</label><input id="num" inputmode="text" placeholder="173" value="' + esc(current ? current.jp.localId : '') + '"></div></div>' +
    '<datalist id="setlist"></datalist>' +
    '<button class="big" type="submit">Find the English card</button></form>' +
    '<details class="quick"><summary>No set code? Search by Pokémon name</summary><form id="nf" autocomplete="off"><input id="nm" placeholder="Pikachu"><button class="big ghost" type="submit">Show Japanese cards</button></form></details>';
}

function helpHtml() {
  return '<div class="help"><p>Look at the <b>bottom left</b> of the Japanese card. Type the short code (like <b>SV2a</b>) and the number before the slash (like <b>173</b>).</p></div>';
}

function priceRow(label, main, sub) { return '<div class="tot"><span>' + label + '</span><b>' + main + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>'; }

function resultHtml(r) {
  const jp = r.jp, e = r.matches[r.pick];
  const verdict = r.pick < 0
    ? '<div class="verdict maybe">Trainer card: tap the English card below with <b>the same picture</b>.</div>'
    : e
    ? (r.picked ? '<div class="verdict ok">You picked: <b>' + esc(e.setName) + ' #' + esc(e.localId) + '</b></div>' : r.sure ? '<div class="verdict ok">Same picture in English: <b>' + esc(e.setName) + ' #' + esc(e.localId) + '</b></div>'
      : '<div class="verdict maybe">Best match: <b>' + esc(e.setName) + ' #' + esc(e.localId) + '</b>. Check the picture is the same' + (r.matches.length > 1 ? ', or tap another below' : '') + '.</div>')
    : '<div class="verdict no">No English card with this picture was found. It may be a <b>Japan-only</b> print, so use the Japanese price.</div>';
  const jpUsd = jp.eur ? '<span>about ' + L.money(jp.eur * EUR_USD) + '</span>' : '';
  const jq = L.jpQuery(r.enName, jp);
  return '<div class="pair"><figure><img src="' + esc(img(jp.image, 'high')) + '" alt="Japanese card"><figcaption>Japanese</figcaption></figure>' +
    (e ? '<figure><img src="' + esc(img(e.image, 'high')) + '" alt="English card"><figcaption>English</figcaption></figure>' : '<figure class="none"><div>' + (r.pick < 0 ? 'Pick it below' : 'No English print found') + '</div></figure>') + '</div>' +
    '<h2>' + esc(r.enName || jp.name) + (r.enName ? ' <small>' + esc(jp.name) + '</small>' : '') + '</h2>' + verdict +
    '<div class="totals">' +
    priceRow('English price (TCGplayer)', e && e.usd ? L.money(e.usd.usd) : '—', e && e.usd ? esc(e.usd.kind.replace(/-/g, ' ')) : (e ? 'no US price yet' : r.pick < 0 ? 'pick the card below' : 'no English card')) +
    '<div class="tot"><span>Japanese price (Europe)</span><b>' + (jp.eur ? L.money(jp.eur, 'EUR') : '—') + '</b>' + (jpUsd || '<span>no price yet</span>') + '</div></div>' +
    '<p class="hint">For what Japanese cards sell for in the US, check eBay sold below.</p>' +
    '<a class="big link" target="_blank" rel="noopener" href="' + esc(L.soldLink(jq)) + '">eBay sold: this Japanese card</a>' +
    (e ? '<a class="big link ghost" target="_blank" rel="noopener" href="' + esc(L.soldLink(L.enQuery(e))) + '">eBay sold: English card</a>' : '') +
    (e && e.usd && e.usd.productId ? '<a class="big link ghost" target="_blank" rel="noopener" href="https://www.tcgplayer.com/product/' + esc(e.usd.productId) + '">TCGplayer: English card</a>' : '') +
    '<a class="big link ghost" target="_blank" rel="noopener" href="' + esc(L.pcLink(jq)) + '">PriceCharting</a>' +
    '<table class="facts">' +
    '<tr><td>Japanese set</td><td>' + esc(jp.setName) + ' (' + esc(jp.setId) + ')</td></tr>' +
    '<tr><td>Number</td><td>' + esc(jp.localId + (jp.official ? '/' + jp.official : '')) + '</td></tr>' +
    (jp.rarity ? '<tr><td>Rarity</td><td>' + esc(jp.rarity) + '</td></tr>' : '') +
    (jp.illustrator ? '<tr><td>Artist</td><td>' + esc(jp.illustrator) + '</td></tr>' : '') +
    (e ? '<tr><td>English set</td><td>' + esc(e.setName) + ' #' + esc(e.localId + (e.official ? '/' + e.official : '')) + '</td></tr>' : '') +
    '</table>' +
    (r.matches.length > 1 || r.pick < 0 ? '<h3>' + (r.pick < 0 ? 'English cards by the same artist' : 'Other English cards by the same artist') + '</h3><p class="hint">Tap the one with the same picture.</p><div class="picks">' +
      r.matches.map((x, i) => '<div data-pick="' + i + '" class="' + (i === r.pick ? 'on' : '') + '"><img loading="lazy" src="' + esc(img(x.image)) + '" alt=""><span>' + esc(x.setName + ' ' + x.localId) + '</span></div>').join('') + '</div>' : '');
}

function namesHtml(n) {
  if (!n.cards.length) return '<div class="empty">No Japanese ' + esc(n.name) + ' cards found.</div>';
  return '<h3>Japanese ' + esc(n.name) + ' cards (' + n.cards.length + ')</h3><p class="hint">Find the set code that matches your card, then tap it.</p><div class="picks">' +
    n.cards.map(c => tile('data-jp="' + esc(c.id) + '"', c, L.cardLabel(c.id))).join('') + '</div>';
}

function busy(on, text) { const o = $('#out'); if (on && o) o.innerHTML = '<div class="empty"><div class="spin"></div>' + esc(text || 'Looking it up…') + '</div>'; }
function fail(e) { const o = $('#out'); if (o) o.innerHTML = '<div class="verdict no">' + esc(navigator.onLine ? e.message : 'No signal. Cards you looked up before are in History.') + '</div>'; }

// Bring the pictures and prices into view on a phone after a look-up
function showResult() { const p = $('.pair'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

function wireForm() {
  getSets().then(sets => { const dl = $('#setlist'); if (dl) dl.innerHTML = sets.map(s => '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>').join(''); }).catch(() => { });
  $('#f').onsubmit = async ev => {
    ev.preventDefault();
    const code = $('#code').value, num = $('#num').value;
    if (!code.trim() || !num.trim()) return toast('Type the set code and the number');
    document.activeElement && document.activeElement.blur();
    busy(true); current = null; nameHits = null;
    try { current = await byCode(code, num); render(); showResult(); } catch (e) { fail(e); }
  };
  $('#nf').onsubmit = async ev => {
    ev.preventDefault();
    const n = $('#nm').value; if (!n.trim()) return;
    document.activeElement && document.activeElement.blur();
    busy(true); current = null;
    try { nameHits = await byName(n); render(); } catch (e) { fail(e); }
  };
}

function wireOut() {
  document.querySelectorAll('[data-pick]').forEach(el => el.onclick = () => {
    current.pick = +el.dataset.pick; current.sure = false; current.picked = true;
    if (!current.jp.dexId) current.enName = current.matches[current.pick].name;
    store(HIST_KEY, hist); render(); window.scrollTo(0, 0);
  });
  document.querySelectorAll('[data-jp]').forEach(el => el.onclick = async () => {
    busy(true); nameHits = null; window.scrollTo(0, 0);
    try { current = await convert(el.dataset.jp); render(); } catch (e) { fail(e); }
  });
}

document.querySelectorAll('nav button').forEach(b => b.onclick = () => { tab = b.dataset.tab; if (tab === 'find' && b.classList.contains('on')) { current = null; nameHits = null; } render(); });
function net() { const n = $('#net'); n.textContent = navigator.onLine ? 'Online' : 'No signal'; n.classList.toggle('off', !navigator.onLine); }
addEventListener('online', net); addEventListener('offline', net); net();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
addEventListener('DOMContentLoaded', render); // after scan.js has loaded
