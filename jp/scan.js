// Scan a case: take a photo of a shop's case, drag a box around one card and its price tag,
// type the ¥ price and the Pokémon, tap the matching card, and see if it's a good deal.
// Every card checked goes on "This case", best deals first. Uses globals from app.js.
const CASE_KEY = 'jp-case', RATE_KEY = 'jp-yen';
const scan = { photo: null, box: null, crop: null, thumb: null, yen: '', poke: '', cands: null, enCands: null, item: null };
let caseList = load(CASE_KEY, []);
let yenRate = load(RATE_KEY, 150);

function scanHtml() {
  let h = '<div class="quick rate"><label for="rate">Yen for $1</label><input id="rate" inputmode="decimal" value="' + esc(yenRate) + '"><span class="hint">Check today\'s rate and change it if needed.</span></div>';
  if (scan.item) h += dealHtml(scan.item);
  else if (scan.crop) h += detailsHtml();
  else if (scan.photo) h += '<p class="hint"><b>Drag a box</b> around one card and its price tag.</p><div class="shot"><canvas id="cv"></canvas></div>' +
    '<button class="big ghost" id="newphoto">Use a different photo</button>';
  else h += '<label class="big photo">Take or choose a photo<input id="file" type="file" accept="image/*" hidden></label>' +
    '<p class="hint">Get close enough that the ¥ price tags are sharp. One shelf at a time works best.</p>';
  h += caseHtml();
  return h;
}

function detailsHtml() {
  let h = '<div class="crop"><img src="' + scan.crop + '" alt="The card you boxed"></div>' +
    '<form id="df" class="quick" autocomplete="off">' +
    '<div class="two"><div><label for="yen">Price on the tag (¥)</label><input id="yen" inputmode="numeric" placeholder="8980" value="' + esc(scan.yen) + '"></div>' +
    '<div><label for="poke">Which Pokémon?</label><input id="poke" placeholder="Moltres" value="' + esc(scan.poke) + '"></div></div>' +
    '<p class="hint">Type it in English. Trainer cards: type the English card name.</p>' +
    '<button class="big" type="submit">Find this card</button>' +
    '<button class="big ghost" type="button" id="redo">Box a different card</button></form><div id="out">';
  if (scan.cands) {
    h += scan.cands.length ? '<h3>Tap the card with the same picture (' + scan.cands.length + ')</h3>' + (scan.cands.length > 12 ? '<input id="flt" class="flt" placeholder="Narrow down: set, number or name" value="' + esc(scan.filter || '') + '">' : '') + '<div class="picks" id="sgrid">' +
      L.filterCards(scan.cands, scan.filter).map(c => tile('data-sjp="' + esc(c.id) + '"', c, L.cardLabel(c.id))).join('') + '</div>' : '';
    h += '<button class="big ghost" id="showen">' + (scan.cands.length ? 'Not here? Pick the English version' : 'No Japanese cards found. Pick the English version') + '</button>';
  }
  if (scan.enCands) {
    h += scan.enCands.length ? '<h3>English cards</h3><p class="hint">Tap the one with the same picture. Its English price is used.</p><div class="picks">' +
      scan.enCands.map(c => tile('data-sen="' + esc(c.id) + '"', c, c.name)).join('') + '</div>'
      : '<div class="verdict no">No English cards called "' + esc(scan.poke) + '" either. Check the spelling.</div>';
  }
  return h + '</div>';
}

const LEVEL = { good: ['ok', 'Good deal'], fair: ['maybe', 'Fair price'], high: ['no', 'Pricey'], none: ['maybe', 'No US price to compare'] };
// Compared only to the English card: say so, because Japanese copies often sell for less
const LEVEL_EN = { good: ['ok', 'Cheap vs English'], fair: ['maybe', 'About the English price'], high: ['no', 'Above the English price'], none: LEVEL.none };
const levelOf = it => (it.deal.ref && /English/.test(it.deal.ref.label) ? LEVEL_EN : LEVEL)[it.deal.level];
function dealHtml(it) {
  const d = it.deal, lv = levelOf(it);
  return '<div class="pair"><figure><img src="' + it.thumb + '" alt="Your photo"><figcaption>In the case</figcaption></figure>' +
    '<figure><img src="' + esc(img(it.image, 'high')) + '" alt=""><figcaption>' + esc(it.isEn ? 'English version' : 'Japanese card') + '</figcaption></figure></div>' +
    '<h2>' + esc(it.name) + (it.jpName ? ' <small>' + esc(it.jpName) + '</small>' : '') + '</h2>' +
    '<div class="verdict ' + lv[0] + ' big-verdict"><b>' + lv[1] + '</b>' + (d.ratio != null ? ': ' + Math.round(d.ratio * 100) + (lv === LEVEL_EN[d.level] ? '% of the English price' : '% of what it\'s worth') : '') + '</div>' +
    '<div class="totals">' +
    '<div class="tot"><span>Tag price</span><b>' + L.yen(it.yen) + '</b><span>' + (d.tagUsd ? 'about ' + L.money(d.tagUsd) : '') + '</span></div>' +
    '<div class="tot"><span>Worth</span><b>' + (d.ref ? L.money(d.ref.usd) : '—') + '</b><span>' + esc(d.ref ? d.ref.label : 'check eBay sold') + '</span></div></div>' +
    (it.refs || []).filter(r => r && d.ref && r !== d.ref && r.label !== d.ref.label).map(r => '<p class="hint">' + esc(r.label) + ': ' + L.money(r.usd) + '</p>').join('') +
    (it.isEn || (d.ref && /English/.test(d.ref.label)) ? '<p class="hint">This compares to the English card. Japanese copies often sell for a different price, so check eBay sold before you buy.</p>' : '') +
    '<a class="big link" target="_blank" rel="noopener" href="' + esc(L.soldLink(it.query)) + '">eBay sold: ' + esc(it.isEn ? 'Japanese version' : 'this card') + '</a>' +
    '<button class="big" id="next">Next card</button>';
}

function caseHtml() {
  if (!caseList.length) return '';
  return '<h3>This case (' + caseList.length + ')</h3><p class="hint">Best deals first.</p>' + L.caseOrder(caseList).map(it => {
    const lv = levelOf(it);
    return '<div class="row" data-ci="' + esc(it.at) + '"><img src="' + it.thumb + '" alt=""><div class="info"><div class="nm">' + esc(it.name) + '</div>' +
      '<div class="sub">' + L.yen(it.yen) + ' (' + (it.deal.tagUsd ? L.money(it.deal.tagUsd) : '—') + ') vs ' + (it.deal.ref ? L.money(it.deal.ref.usd) : '—') + '</div></div>' +
      '<div class="val"><span class="tag ' + lv[0] + '">' + lv[1] + '</span><button class="xdel" data-cdel="' + esc(it.at) + '">✕</button></div></div>';
  }).join('') + '<button class="big ghost" id="newcase">Start a new case</button>';
}

// ---------- photo and box ----------
function drawPhoto() {
  const cv = $('#cv'); if (!cv || !scan.photo) return;
  const im = scan.photo, maxW = cv.parentElement.clientWidth, maxH = Math.round(innerHeight * 0.7);
  const s = Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight, 1);
  cv.width = Math.round(im.naturalWidth * s); cv.height = Math.round(im.naturalHeight * s);
  cv.dataset.s = s;
  const g = cv.getContext('2d'); g.drawImage(im, 0, 0, cv.width, cv.height);
  // cards already checked in this photo
  caseList.filter(it => it.box && it.photoId === scan.photoId).forEach(it => {
    g.strokeStyle = { good: '#4ade80', fair: '#ffcb05', high: '#f87171', none: '#a3a8b5' }[it.deal.level]; g.lineWidth = 3;
    g.strokeRect(it.box.x * s, it.box.y * s, it.box.w * s, it.box.h * s);
  });
  if (scan.box) { g.strokeStyle = '#60a5fa'; g.lineWidth = 3; g.setLineDash([8, 6]); g.strokeRect(scan.box.x * s, scan.box.y * s, scan.box.w * s, scan.box.h * s); g.setLineDash([]); }
}

function wireCanvas() {
  const cv = $('#cv'); if (!cv) return;
  let start = null;
  const pt = ev => { const r = cv.getBoundingClientRect(), s = +cv.dataset.s; return { x: (ev.clientX - r.left) / s, y: (ev.clientY - r.top) / s }; };
  cv.onpointerdown = ev => { cv.setPointerCapture(ev.pointerId); start = pt(ev); scan.box = null; };
  cv.onpointermove = ev => { if (!start) return; const p = pt(ev); scan.box = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) }; drawPhoto(); };
  cv.onpointerup = () => {
    start = null;
    const b = scan.box, im = scan.photo;
    if (!b || b.w < im.naturalWidth / 40 || b.h < im.naturalHeight / 40) { scan.box = null; drawPhoto(); return toast('Drag a box around one card'); }
    scan.crop = cropTo(b, 900); scan.thumb = cropTo(b, 220);
    scan.yen = ''; scan.poke = ''; scan.cands = null; scan.enCands = null; scan.filter = '';
    render(); window.scrollTo(0, 0);
  };
}

function cropTo(b, maxSide) {
  const s = Math.min(1, maxSide / Math.max(b.w, b.h)), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(b.w * s)); c.height = Math.max(1, Math.round(b.h * s));
  c.getContext('2d').drawImage(scan.photo, b.x, b.y, b.w, b.h, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

function openPhoto(file) {
  const url = URL.createObjectURL(file), im = new Image();
  im.onload = () => { scan.photo = im; scan.photoId = Date.now(); scan.box = null; render(); };
  im.onerror = () => toast('Could not open that picture');
  im.src = url;
}

// ---------- finding the card and the deal ----------
async function finish(kind, id) {
  const o = $('#out'); if (o) o.innerHTML = '<div class="empty"><div class="spin"></div>Checking the price…</div>';
  let it;
  if (kind === 'jp') {
    const r = await convert(id), e = r.matches[r.pick];
    const refs = [r.jp.eur ? { usd: r.jp.eur * EUR_USD, label: 'Japanese card, Europe price' } : null,
      e && e.usd ? { usd: e.usd.usd, label: 'English card, TCGplayer' } : null];
    it = { name: r.enName || scan.poke, jpName: r.jp.name, image: r.jp.image, query: L.jpQuery(r.enName || scan.poke, r.jp), refs, jpId: r.jp.id };
  } else {
    const e = await get('en/cards/' + encodeURIComponent(id)), u = L.usdMarket(e.pricing);
    it = { name: e.name, image: e.image, isEn: true, query: e.name + ' japanese', refs: [u ? { usd: u.usd, label: 'English card, TCGplayer' } : null] };
  }
  it.at = new Date().toISOString(); it.yen = scan.yen; it.thumb = scan.thumb; it.box = scan.box; it.photoId = scan.photoId;
  it.deal = L.dealCheck(it.yen, yenRate, it.refs);
  caseList = [it].concat(caseList).slice(0, 80); store(CASE_KEY, caseList);
  scan.item = it; render(); window.scrollTo(0, 0);
}

function wirePicks() {
  document.querySelectorAll('[data-sjp]').forEach(el => el.onclick = () => { scan.yen = $('#yen').value; finish('jp', el.dataset.sjp).catch(e => toast(e.message)); });
  document.querySelectorAll('[data-sen]').forEach(el => el.onclick = () => { scan.yen = $('#yen').value; finish('en', el.dataset.sen).catch(e => toast(e.message)); });
}

function wireScan() {
  const rate = $('#rate'); rate.onchange = () => {
    const v = Number(rate.value); if (!(v > 1)) return toast('Type how many yen make $1, like 150');
    yenRate = v; store(RATE_KEY, v);
    caseList.forEach(it => it.deal = L.dealCheck(it.yen, yenRate, it.refs)); store(CASE_KEY, caseList); render();
  };
  const f = $('#file'); if (f) f.onchange = () => f.files[0] && openPhoto(f.files[0]);
  const np = $('#newphoto'); if (np) np.onclick = () => { scan.photo = null; scan.box = null; render(); };
  if ($('#cv')) { drawPhoto(); wireCanvas(); }
  const redo = $('#redo'); if (redo) redo.onclick = () => { scan.crop = null; scan.box = null; render(); };
  const df = $('#df'); if (df) df.onsubmit = async ev => {
    ev.preventDefault();
    scan.yen = $('#yen').value; scan.poke = $('#poke').value.trim();
    if (!scan.poke) return toast('Type which Pokémon it is');
    document.activeElement && document.activeElement.blur();
    $('#out').innerHTML = '<div class="empty"><div class="spin"></div>Looking it up…</div>';
    scan.enCands = null;
    try { scan.cands = (await byName(scan.poke)).cards; }
    catch (e) { scan.cands = []; }
    render(); const out = $('#out'); if (out) out.scrollIntoView({ behavior: 'smooth' });
  };
  const flt = $('#flt'); if (flt) flt.oninput = () => {
    scan.filter = flt.value;
    $('#sgrid').innerHTML = L.filterCards(scan.cands, scan.filter).map(c => tile('data-sjp="' + esc(c.id) + '"', c, L.cardLabel(c.id))).join('');
    wirePicks();
  };
  wirePicks();
  const showen = $('#showen'); if (showen) showen.onclick = async () => {
    scan.yen = $('#yen').value;
    showen.textContent = 'Looking…';
    try { scan.enCands = ((await get('en/cards?name=' + encodeURIComponent(scan.poke))) || []).slice(-60).reverse(); } catch (e) { scan.enCands = []; }
    render(); const h = document.querySelectorAll('#out h3'); if (h.length) h[h.length - 1].scrollIntoView({ behavior: 'smooth' });
  };
  const nx = $('#next'); if (nx) nx.onclick = () => { scan.item = null; scan.crop = null; scan.box = null; scan.cands = null; scan.enCands = null; render(); window.scrollTo(0, 0); };
  document.querySelectorAll('[data-cdel]').forEach(el => el.onclick = ev => {
    ev.stopPropagation();
    if (!el.classList.contains('sure')) { el.classList.add('sure'); el.textContent = 'Remove?'; return; }
    caseList = caseList.filter(it => it.at !== el.dataset.cdel); store(CASE_KEY, caseList); render();
  });
  document.querySelectorAll('[data-ci]').forEach(el => el.onclick = () => { const it = caseList.find(x => x.at === el.dataset.ci); if (it) { scan.item = it; render(); window.scrollTo(0, 0); } });
  const nc = $('#newcase'); if (nc) nc.onclick = () => {
    if (!nc.dataset.sure) { nc.dataset.sure = 1; nc.textContent = 'Tap again to clear this case'; return; }
    caseList = []; store(CASE_KEY, caseList); scan.photo = null; scan.item = null; scan.crop = null; render();
  };
}
