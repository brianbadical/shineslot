// Auto scan: send a case photo to Claude, which finds every card and ¥ tag and looks up the
// Japanese card's US price on PriceCharting / eBay sold / Collectr. Uses Brian's own Claude
// API key, saved only on this phone. Uses globals from app.js and scan.js.
const KEY_KEY = 'jp-claude-key', MODEL_KEY = 'jp-claude-model', AUTO_KEY = 'jp-auto';
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.6.0/+esm';
const MODELS = {
  'claude-opus-5-5': { label: 'Best reading (Opus)', inUsd: 4, outUsd: 20 },
  'claude-sonnet-5-5': { label: 'Cheaper (Sonnet)', inUsd: 2, outUsd: 10 },
};
const PRICE_SITES = ['pricecharting.com', 'ebay.com', 'getcollectr.com'];
const SEARCH_USD = 0.01; // web search is $10 per 1,000 searches
let autoRuns = load(AUTO_KEY, []);
const auto = { busy: false, run: null, err: '', step: '' };

const AUTO_SYSTEM = 'You help a US card reseller spot deals in Japanese Pokémon card shop display cases. ' +
  'You read photos carefully and only report what you can actually see. Prices you report come from the sites you looked at, never from memory.';
const AUTO_PROMPT = rate => 'This is a photo of a Japanese card shop display case.\n' +
  '1. Find every card whose ¥ price tag you can read. For each one give: the card name in English, the Japanese set and card number if you can tell, ' +
  'the ¥ price on its tag (a number), the shop condition mark if shown (状態A, 状態B and so on; graded slabs: the grade), and where it is (like "row 2, 3rd from left"). ' +
  'Put identical cards with the same tag price on one line with a count.\n' +
  '2. Look up what the Japanese version sells for in the US: PriceCharting first (the ungraded price, or the matching grade for a slab), then eBay sold listings or Collectr when PriceCharting has nothing or looks off. ' +
  'Never use the English version\'s price: old Japanese cards often sell for a fraction of it. If you can\'t find a Japanese price, use null.\n' +
  '3. Mark sure=false when you are not certain which card it is.\n' +
  'The rate is ' + rate + ' yen to $1. Keep notes to a few plain words.\n' +
  'End your reply with one ```json code block, exactly this shape:\n' +
  '{"cards":[{"name":"","set":"","number":"","tag_yen":0,"condition":"","where":"","count":1,"usd":null,"source":"","url":"","sure":true,"note":""}],"unreadable":0}\n' +
  '"unreadable" is how many tags you could see but not read.';

function autoKey() { return load(KEY_KEY, ''); }
function autoModel() { const m = load(MODEL_KEY, 'claude-opus-5-5'); return MODELS[m] ? m : 'claude-opus-5-5'; }

// A smaller JPEG of the photo for Claude (it doesn't use more than about 1,600 pixels a side)
function photoData(maxSide) {
  const im = scan.photo, s = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

async function autoScan() {
  const key = autoKey(), model = autoModel();
  if (!key) { auto.err = 'Add your Claude key first (below).'; return render(); }
  auto.busy = true; auto.err = ''; auto.run = null; auto.step = 'Reading the case…'; render();
  const timer = setTimeout(() => { if (auto.busy) { auto.step = 'Checking prices on PriceCharting, eBay and Collectr… (this can take a few minutes)'; render(); } }, 25000);
  try {
    const { default: Anthropic } = await import(SDK_URL);
    const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
    const data = photoData(1568);
    let messages = [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: data.split(',')[1] } },
      { type: 'text', text: AUTO_PROMPT(yenRate) },
    ] }];
    const use = { inTok: 0, outTok: 0, searches: 0 };
    let msg;
    for (let i = 0; i < 5; i++) {
      msg = await client.beta.messages.stream({
        model, max_tokens: 32000,
        betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
        output_config: { effort: 'medium' },
        system: AUTO_SYSTEM,
        tools: [
          { type: 'web_search_20260209', name: 'web_search', max_uses: 15, allowed_domains: PRICE_SITES },
          { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 10, allowed_domains: PRICE_SITES },
        ],
        messages,
      }).finalMessage();
      const u = msg.usage || {};
      use.inTok += (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
      use.outTok += u.output_tokens || 0;
      use.searches += (u.server_tool_use && u.server_tool_use.web_search_requests) || 0;
      if (msg.stop_reason !== 'pause_turn') break;
      messages = messages.concat([{ role: 'assistant', content: msg.content }]); // let the server carry on
    }
    if (msg.stop_reason === 'refusal') throw new Error('Claude declined to read this photo. Try another one.');
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    const parsed = L.parseScan(text);
    if (!parsed) throw new Error('Claude answered, but not in the expected shape. Try again.');
    const p = MODELS[model];
    const cost = use.inTok / 1e6 * p.inUsd + use.outTok / 1e6 * p.outUsd + use.searches * SEARCH_USD;
    auto.run = { at: new Date().toISOString(), thumb: photoData(480), cards: parsed.cards, unreadable: parsed.unreadable, cost, model };
    autoRuns = [auto.run].concat(autoRuns).slice(0, 15); store(AUTO_KEY, autoRuns);
  } catch (e) {
    const s = e && e.status;
    auto.err = s === 401 ? 'Claude didn\'t accept the key. Check it below.'
      : s === 400 && /credit/i.test(String(e.message)) ? 'Your Claude account is out of credit.'
      : s === 429 || s === 529 ? 'Claude is busy right now. Try again in a minute.'
      : !navigator.onLine ? 'No signal. Try again when you have signal.'
      : (e && e.message) || 'Something went wrong. Try again.';
  } finally {
    clearTimeout(timer); auto.busy = false; auto.step = ''; render();
  }
}

const AUTO_BADGE = { good: ['ok', 'Look closer'], fair: ['maybe', 'Fair'], high: ['no', 'Over market'], none: ['maybe', 'No price found'] };
function autoHtml(run) {
  const rows = L.rankScan(run.cards, yenRate);
  let h = '<div class="quick"><h3 style="margin-top:0">' + rows.length + ' card' + (rows.length === 1 ? '' : 's') + ' found</h3>' +
    '<p class="hint">' + (run.unreadable ? run.unreadable + ' tag' + (run.unreadable === 1 ? '' : 's') + ' too blurry to read. ' : '') +
    'Look closer = tag is 80% of the Japanese price or less. This scan cost about ' + L.money(run.cost) + '.</p>';
  h += rows.map(r => {
    const b = AUTO_BADGE[r.deal.level], c = r.card;
    const url = /^https:\/\/([a-z0-9-]+\.)*(pricecharting\.com|ebay\.com|getcollectr\.com)\//i.test(c.url || '') ? c.url : '';
    return '<div class="arow"><div class="info"><div class="nm">' + esc(c.name || '?') + (c.count > 1 ? ' ×' + esc(c.count) : '') + '</div>' +
      '<div class="sub">' + esc([c.set, c.number].filter(Boolean).join(' ')) + (c.condition ? ' · ' + esc(c.condition) : '') + (c.where ? ' · ' + esc(c.where) : '') + '</div>' +
      '<div class="sub">Tag ' + L.yen(c.tag_yen) + (r.deal.tagUsd ? ' (' + L.money(r.deal.tagUsd) + ')' : '') + ' · Japanese ' + (c.usd ? L.money(c.usd) : '—') +
      (url ? ' <a target="_blank" rel="noopener" href="' + esc(url) + '">' + esc(c.source || 'source') + '</a>' : c.source ? ' (' + esc(c.source) + ')' : '') + '</div>' +
      (c.sure === false ? '<div class="sub warn">Not sure which card this is</div>' : '') + (c.note ? '<div class="sub">' + esc(c.note) + '</div>' : '') +
      '</div><div class="val"><span class="tag ' + b[0] + '">' + b[1] + '</span>' + (r.deal.ratio != null ? '<b>' + Math.round(r.deal.ratio * 100) + '%</b>' : '') + '</div></div>';
  }).join('');
  return h + '<p class="hint">Check the card and its condition before you buy. Prices are what the Japanese card sells for in the US.</p></div>';
}

function keyHtml() {
  const has = !!autoKey(), m = autoModel();
  return '<details class="quick"' + (has ? '' : ' open') + '><summary>' + (has ? 'Claude key saved' : 'Set up auto scan (Claude key)') + '</summary>' +
    '<p class="hint">Auto scan uses your own Claude account. Make a key at <a href="https://platform.claude.com/" target="_blank" rel="noopener">platform.claude.com</a> (API keys) and add a few dollars of credit. ' +
    'The key is saved only on this phone. Each scan shows what it cost, usually well under $1.</p>' +
    '<label for="ckey">Claude key</label><input id="ckey" type="password" autocomplete="off" placeholder="' + (has ? 'Saved. Paste a new one to change it' : 'sk-ant-…') + '">' +
    '<label for="cmodel">Reading</label><select id="cmodel">' + Object.keys(MODELS).map(k => '<option value="' + k + '"' + (k === m ? ' selected' : '') + '>' + MODELS[k].label + '</option>').join('') + '</select>' +
    '<button class="big ghost" type="button" id="savekey">Save</button>' + (has ? '<button class="big ghost" type="button" id="delkey">Remove the key from this phone</button>' : '') + '</details>';
}

function autoBlock() {
  if (auto.busy) return '<div class="quick empty"><div class="spin"></div>' + esc(auto.step) + '</div>';
  let h = '';
  if (auto.err) h += '<div class="verdict no">' + esc(auto.err) + '</div>';
  if (scan.photo) h += '<button class="big" id="autoscan">Find every card and price it</button>';
  if (auto.run) h += autoHtml(auto.run);
  return h;
}

function wireAuto() {
  const a = $('#autoscan'); if (a) a.onclick = () => autoScan();
  const sk = $('#savekey'); if (sk) sk.onclick = () => {
    const v = $('#ckey').value.trim();
    if (v) store(KEY_KEY, v);
    store(MODEL_KEY, $('#cmodel').value);
    auto.err = ''; toast(v ? 'Key saved on this phone' : 'Saved'); render();
  };
  const dk = $('#delkey'); if (dk) dk.onclick = () => { try { localStorage.removeItem(KEY_KEY); } catch (e) { } toast('Key removed'); render(); };
  document.querySelectorAll('[data-run]').forEach(el => el.onclick = () => { auto.run = autoRuns[+el.dataset.run]; render(); window.scrollTo(0, 0); });
}

function pastRunsHtml() {
  if (!autoRuns.length) return '';
  return '<h3>Past auto scans</h3>' + autoRuns.map((r, i) => {
    const look = L.rankScan(r.cards, yenRate).filter(x => x.deal.level === 'good').length;
    return '<div class="row" data-run="' + i + '"><img src="' + r.thumb + '" alt="" style="object-fit:cover"><div class="info"><div class="nm">' + r.cards.length + ' cards, ' + look + ' to look closer</div>' +
      '<div class="sub">' + esc(new Date(r.at).toLocaleString()) + ' · ' + L.money(r.cost) + '</div></div></div>';
  }).join('');
}
