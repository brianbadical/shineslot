// Workout app screens. Everything is saved on this phone only (localStorage).
const KEY = 'workout-v1';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let S = load();
let tab = S.current ? 'today' : 'today';
let rest = null; // { until, total, timer }

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.history) return s; } catch (e) {}
  return { plan: null, history: [], current: null, unit: 'lb' };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save. Phone storage full?'); } }
function toast(t) { const el = $('#toast'); el.textContent = t; el.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => el.style.display = 'none', 2600); }
const fmtDate = t => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const unitWord = e => e.unit === 'sec' ? 'sec' : 'reps';

document.querySelectorAll('nav button').forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });

function draw() {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const m = $('#main');
  if (!S.plan) { m.innerHTML = pickPlanHTML(true); bindPick(); return; }
  if (tab === 'today') S.current ? drawWorkout(m) : drawToday(m);
  else if (tab === 'history') drawHistory(m);
  else drawPlan(m);
  window.scrollTo(0, tab === 'today' && S.current ? window.scrollY : 0);
}

/* ---------- first run: pick a plan ---------- */
function pickPlanHTML(first) {
  return `${first ? '<h2>Pick a plan to start</h2><p class="hint">You can change any exercise later.</p>' : '<h3>Start over with a new plan</h3><p class="hint">Your history stays.</p>'}
  ${WL.STARTERS.map(s => `<button class="choice" data-key="${s.key}"><b>${esc(s.name)}</b><span>${esc(s.why)}</span><span class="dim">${s.days.map(d => esc(d.name)).join(' · ')}</span></button>`).join('')}`;
}
function bindPick() {
  document.querySelectorAll('.choice').forEach(b => b.onclick = () => {
    if (S.plan && !confirmTap(b, 'Tap again to switch plans')) return;
    S.plan = WL.planFrom(b.dataset.key); save(); tab = 'today'; draw(); toast('Plan ready');
  });
}
// Two-tap confirm (no pop-up boxes).
function confirmTap(el, msg) {
  if (el.dataset.sure) return true;
  el.dataset.sure = '1'; el.classList.add('sure'); const old = el.innerHTML;
  if (el.tagName === 'BUTTON' && !el.classList.contains('choice')) el.textContent = msg; else toast(msg);
  setTimeout(() => { delete el.dataset.sure; el.classList.remove('sure'); if (el.tagName === 'BUTTON' && !el.classList.contains('choice')) el.innerHTML = old; }, 3000);
  return false;
}

/* ---------- Today ---------- */
function drawToday(m) {
  const st = WL.stats(S.history);
  const next = WL.nextDay(S.plan, S.history);
  m.innerHTML = `
    <div class="totals">
      <div class="tot"><b>${st.thisWeek}</b><span>workouts this week</span></div>
      <div class="tot"><b>${st.streak}</b><span>week${st.streak === 1 ? '' : 's'} in a row</span></div>
    </div>
    <div class="card next">
      <div class="dim">Up next</div>
      <h2>${esc(next.name)}</h2>
      <ul class="plain">${next.ex.map(e => `<li>${esc(e.name)} <span class="dim">${e.sets} × ${e.reps} ${unitWord(e)}</span></li>`).join('')}</ul>
      <button class="big" data-start="${next.id}">Start ${esc(next.name)}</button>
    </div>
    ${S.plan.days.length > 1 ? `<p class="hint">Or do a different day:</p><div class="days">${S.plan.days.filter(d => d.id !== next.id).map(d => `<button class="ghost" data-start="${d.id}">${esc(d.name)}</button>`).join('')}</div>` : ''}`;
  m.querySelectorAll('[data-start]').forEach(b => b.onclick = () => {
    const day = S.plan.days.find(d => d.id === b.dataset.start);
    if (!day.ex.length) return toast('This day has no exercises. Add some in Plan.');
    S.current = WL.startWorkout(S.plan, day, S.history); save(); draw(); keepAwake();
  });
}

function drawWorkout(m) {
  const w = S.current;
  const doneSets = w.ex.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  const allSets = w.ex.reduce((n, e) => n + e.sets.length, 0);
  m.innerHTML = `
    <div class="whead"><h2>${esc(w.name)}</h2><span class="dim" id="clock"></span></div>
    <div class="bar"><i style="width:${allSets ? Math.round(doneSets / allSets * 100) : 0}%"></i></div>
    ${w.ex.map((e, i) => `
      <div class="card ex">
        <div class="exhead"><h3>${esc(e.name)}</h3><span class="dim">${e.sets.length} × ${e.target} ${unitWord(e)}</span></div>
        <p class="tip">${esc(e.tip || '')}</p>
        <div class="sets">
          <div class="sh"><span>Set</span>${e.weight ? `<span>${esc(S.unit)}</span>` : ''}<span>${unitWord(e)}</span><span></span></div>
          ${e.sets.map((s, j) => `
            <div class="set ${s.done ? 'done' : ''} ${e.weight ? '' : 'nw'}">
              <span class="n">${j + 1}</span>
              ${e.weight ? `<input inputmode="decimal" data-i="${i}" data-j="${j}" data-k="w" value="${esc(s.w)}" placeholder="0">` : ''}
              <input inputmode="numeric" data-i="${i}" data-j="${j}" data-k="r" value="${esc(s.r)}">
              <button class="tick" data-i="${i}" data-j="${j}" aria-label="Set done">${s.done ? '✓' : ''}</button>
            </div>`).join('')}
        </div>
        <div class="exfoot"><button class="link" data-add="${i}">+ Add a set</button>${e.sets.length > 1 ? `<button class="link" data-drop="${i}">− Remove last set</button>` : ''}</div>
      </div>`).join('')}
    <button class="big go" id="finish">Finish workout</button>
    <button class="big ghost danger" id="quit">Throw this workout away</button>`;

  m.querySelectorAll('input').forEach(inp => inp.oninput = () => {
    const s = w.ex[inp.dataset.i].sets[inp.dataset.j]; s[inp.dataset.k] = inp.value.replace(/[^0-9.]/g, '');
    // Changing set 1's weight carries to the sets after it that aren't done yet.
    if (inp.dataset.k === 'w') w.ex[inp.dataset.i].sets.forEach((o, j) => { if (j > inp.dataset.j && !o.done) o.w = s.w; });
    save();
  });
  m.querySelectorAll('input[data-k="w"]').forEach(inp => inp.onchange = () => drawWorkout(m));
  m.querySelectorAll('.tick').forEach(b => b.onclick = () => {
    const e = w.ex[b.dataset.i], s = e.sets[b.dataset.j];
    s.done = !s.done; save();
    if (s.done) startRest(e.rest);
    const y = window.scrollY; drawWorkout(m); window.scrollTo(0, y);
  });
  m.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const e = w.ex[b.dataset.add]; const l = e.sets[e.sets.length - 1]; e.sets.push({ w: l.w, r: l.r, done: false }); save(); const y = window.scrollY; drawWorkout(m); window.scrollTo(0, y); });
  m.querySelectorAll('[data-drop]').forEach(b => b.onclick = () => { w.ex[b.dataset.drop].sets.pop(); save(); const y = window.scrollY; drawWorkout(m); window.scrollTo(0, y); });
  $('#finish').onclick = e => {
    if (!doneSets) return toast('Tick at least one set first');
    if (doneSets < allSets && !confirmTap(e.target, `${allSets - doneSets} sets not ticked. Tap again to finish`)) return;
    w.end = Date.now(); S.history.unshift(w); S.current = null; stopRest(); save();
    const sm = WL.summary(w);
    tab = 'today'; draw();
    toast(`Done! ${sm.sets} sets in ${sm.mins} min`);
    letSleep();
  };
  $('#quit').onclick = e => { if (!confirmTap(e.target, 'Tap again to throw it away')) return; S.current = null; stopRest(); save(); draw(); letSleep(); };
  tickClock();
}
function tickClock() {
  const c = $('#clock'); if (!c || !S.current) return;
  const s = Math.floor((Date.now() - S.current.start) / 1000);
  c.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
setInterval(tickClock, 1000);

/* ---------- rest timer ---------- */
function startRest(sec) {
  stopRest(); if (!sec) return;
  rest = { until: Date.now() + sec * 1000, total: sec };
  rest.timer = setInterval(drawRest, 250); drawRest();
}
function stopRest() { if (rest) clearInterval(rest.timer); rest = null; $('#rest').classList.remove('on'); }
function drawRest() {
  if (!rest) return;
  const left = Math.max(0, Math.ceil((rest.until - Date.now()) / 1000));
  const el = $('#rest'); el.classList.add('on');
  $('#restT').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  $('#restBar').style.width = `${100 - Math.min(100, (left / rest.total) * 100)}%`;
  if (left === 0) { beep(); stopRest(); toast('Rest over. Next set!'); }
}
$('#restPlus').onclick = () => { if (rest) { rest.until += 30000; rest.total += 30; drawRest(); } };
$('#restSkip').onclick = stopRest;
let ac;
function beep() {
  try { navigator.vibrate && navigator.vibrate([300, 120, 300]); } catch (e) {}
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach(t => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; g.gain.value = 0.2; o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.15); });
  } catch (e) {}
}
// Keep the screen on during a workout where the phone allows it.
let lock;
async function keepAwake() { try { lock = await navigator.wakeLock?.request('screen'); } catch (e) {} }
function letSleep() { try { lock && lock.release(); } catch (e) {} lock = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.current) { keepAwake(); drawRest(); } });

/* ---------- History ---------- */
function drawHistory(m) {
  if (!S.history.length) { m.innerHTML = '<div class="empty">No workouts yet.<br>Finish one and it shows up here.</div>'; return; }
  const st = WL.stats(S.history);
  m.innerHTML = `<p class="hint">${st.total} workout${st.total === 1 ? '' : 's'} so far. Tap one to see it.</p>` + S.history.map((w, i) => {
    const sm = WL.summary(w);
    return `<div class="card hist" data-h="${i}">
      <div class="exhead"><b>${esc(w.name)}</b><span class="dim">${fmtDate(w.end || w.start)}</span></div>
      <div class="dim">${sm.sets} sets · ${sm.mins} min${sm.volume ? ` · ${sm.volume.toLocaleString()} ${esc(S.unit)} lifted` : ''}</div>
      <div class="more" hidden>
        ${w.ex.filter(e => e.sets.some(s => s.done)).map(e => `<div class="hl"><span>${esc(e.name)}</span><span>${e.sets.filter(s => s.done).map(s => e.weight && s.w ? `${esc(s.w)}×${esc(s.r)}` : esc(s.r) + (e.unit === 'sec' ? 's' : '')).join(', ')}</span></div>`).join('')}
        <button class="ghost small danger" data-del="${i}">Delete this workout</button>
      </div></div>`;
  }).join('');
  m.querySelectorAll('.hist').forEach(c => c.onclick = ev => { if (ev.target.dataset.del) return; const mo = c.querySelector('.more'); mo.hidden = !mo.hidden; });
  m.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (!confirmTap(b, 'Tap again to delete')) return; S.history.splice(+b.dataset.del, 1); save(); draw(); });
}

/* ---------- Plan ---------- */
function drawPlan(m) {
  m.innerHTML = `<p class="hint">${esc(S.plan.name)}. Tap an exercise to change it.</p>` +
    S.plan.days.map((d, di) => `
    <div class="card">
      <div class="exhead"><input class="dayname" data-di="${di}" value="${esc(d.name)}" aria-label="Day name"></div>
      ${d.ex.map((e, ei) => `<div class="pex" data-di="${di}" data-ei="${ei}"><span>${esc(e.name)}</span><span class="dim">${e.sets} × ${e.reps} ${unitWord(e)}${e.weight ? '' : ' · no weight'}</span></div>`).join('')}
      <button class="link" data-addex="${di}">+ Add an exercise</button>
      ${S.plan.days.length > 1 ? `<button class="link danger" data-delday="${di}">Remove this day</button>` : ''}
    </div>`).join('') + `
    <button class="ghost big" id="addDay">+ Add a day</button>
    <h3>Settings</h3>
    <div class="seg2"><button data-unit="lb" class="${S.unit === 'lb' ? 'on' : ''}">Pounds (lb)</button><button data-unit="kg" class="${S.unit === 'kg' ? 'on' : ''}">Kilos (kg)</button></div>
    <h3>Backup</h3>
    <p class="hint">Workouts live only on this phone. Save a backup file now and then.</p>
    <button class="ghost big" id="exp">Save a backup file</button>
    <label class="ghost big filebtn">Load a backup file<input type="file" id="imp" accept=".json,application/json" hidden></label>
    ${pickPlanHTML(false)}`;
  bindPick();
  m.querySelectorAll('.dayname').forEach(i => i.onchange = () => { S.plan.days[i.dataset.di].name = i.value.trim() || 'Day'; save(); });
  m.querySelectorAll('.pex').forEach(r => r.onclick = () => editEx(+r.dataset.di, +r.dataset.ei));
  m.querySelectorAll('[data-addex]').forEach(b => b.onclick = () => editEx(+b.dataset.addex, -1));
  m.querySelectorAll('[data-delday]').forEach(b => b.onclick = () => { if (!confirmTap(b, 'Tap again to remove the day')) return; S.plan.days.splice(+b.dataset.delday, 1); save(); draw(); });
  $('#addDay').onclick = () => { S.plan.days.push({ id: WL.uid(), name: `Day ${String.fromCharCode(65 + S.plan.days.length)}`, ex: [] }); save(); draw(); };
  m.querySelectorAll('[data-unit]').forEach(b => b.onclick = () => { S.unit = b.dataset.unit; save(); draw(); });
  $('#exp').onclick = () => {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `workouts-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };
  $('#imp').onchange = async ev => {
    try {
      const d = JSON.parse(await ev.target.files[0].text());
      if (!d.plan || !Array.isArray(d.history)) throw 0;
      S = { unit: 'lb', ...d }; save(); draw(); toast(`Loaded ${S.history.length} workouts`);
    } catch (e) { toast('That file is not a workout backup'); }
  };
}

function editEx(di, ei) {
  const day = S.plan.days[di];
  const e = ei >= 0 ? day.ex[ei] : { name: '', sets: 3, reps: 10, unit: 'reps', weight: true, rest: 90 };
  const sh = $('#sheetIn');
  sh.innerHTML = `
    <h2>${ei >= 0 ? 'Change exercise' : 'Add an exercise'}</h2>
    <label>Name</label><input id="fName" value="${esc(e.name)}" placeholder="e.g. Bench press" list="exList">
    <datalist id="exList">${[...new Set(WL.STARTERS.flatMap(s => s.days.flatMap(d => d.ex.map(x => x.name))))].map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <div class="two">
      <div><label>Sets</label><input id="fSets" inputmode="numeric" value="${e.sets}"></div>
      <div><label>${e.unit === 'sec' ? 'Seconds' : 'Reps'} each</label><input id="fReps" inputmode="numeric" value="${e.reps}"></div>
    </div>
    <label>Counted in</label>
    <div class="seg2"><button data-u="reps" class="${e.unit !== 'sec' ? 'on' : ''}">Reps</button><button data-u="sec" class="${e.unit === 'sec' ? 'on' : ''}">Seconds</button></div>
    <label>Uses weight?</label>
    <div class="seg2"><button data-wt="1" class="${e.weight ? 'on' : ''}">Yes</button><button data-wt="0" class="${e.weight ? '' : 'on'}">No (body weight)</button></div>
    <label>Rest between sets</label>
    <div class="seg4">${[30, 60, 90, 120, 180].map(r => `<button data-r="${r}" class="${e.rest === r ? 'on' : ''}">${r < 60 ? r + 's' : r / 60 + ' min'}</button>`).join('')}</div>
    <button class="big" id="fSave">Save</button>
    ${ei >= 0 ? `<div class="two"><button class="ghost" id="fUp" ${ei === 0 ? 'disabled' : ''}>Move up</button><button class="ghost" id="fDown" ${ei === day.ex.length - 1 ? 'disabled' : ''}>Move down</button></div><button class="ghost big danger" id="fDel">Remove from this day</button>` : ''}
    <button class="ghost big" id="fClose">Cancel</button>`;
  const f = { ...e };
  const seg = (attr, set) => sh.querySelectorAll(`[${attr}]`).forEach(b => b.onclick = () => { sh.querySelectorAll(`[${attr}]`).forEach(x => x.classList.toggle('on', x === b)); set(b.getAttribute(attr)); });
  seg('data-u', v => { f.unit = v; sh.querySelector('#fReps').previousElementSibling.textContent = v === 'sec' ? 'Seconds each' : 'Reps each'; });
  seg('data-wt', v => f.weight = v === '1');
  seg('data-r', v => f.rest = +v);
  $('#sheet').classList.add('on');
  const close = () => $('#sheet').classList.remove('on');
  $('#fClose').onclick = close;
  $('#fSave').onclick = () => {
    f.name = $('#fName').value.trim(); f.sets = Math.max(1, Math.min(10, parseInt($('#fSets').value) || 3)); f.reps = Math.max(1, parseInt($('#fReps').value) || 10);
    if (!f.name) return toast('Give it a name');
    if (ei >= 0) day.ex[ei] = f; else day.ex.push(f);
    save(); close(); draw();
  };
  if (ei >= 0) {
    $('#fDel').onclick = ev => { if (!confirmTap(ev.target, 'Tap again to remove')) return; day.ex.splice(ei, 1); save(); close(); draw(); };
    $('#fUp').onclick = () => { [day.ex[ei - 1], day.ex[ei]] = [day.ex[ei], day.ex[ei - 1]]; save(); close(); draw(); };
    $('#fDown').onclick = () => { [day.ex[ei + 1], day.ex[ei]] = [day.ex[ei], day.ex[ei + 1]]; save(); close(); draw(); };
  }
}
$('#sheet').onclick = e => { if (e.target.id === 'sheet') $('#sheet').classList.remove('on'); };

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
draw();
if (S.current) keepAwake();
