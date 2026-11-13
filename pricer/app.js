// Card Show Pricer: everything is saved on this phone, so it works with no signal.
const API = 'https://api.pokemontcg.io/v2/cards';
const KEY = 'pricer-cards-v1';
const VARIANTS = {normal:'Normal',holofoil:'Holo',reverseHolofoil:'Reverse holo','1stEditionHolofoil':'1st Ed holo','1stEditionNormal':'1st Ed',unlimitedHolofoil:'Unlimited holo'};
const PSA_API = 'https://api.psacard.com/publicapi/cert/GetByCertNumber/';
const TOKEN_KEY = 'pricer-psa-token';
const XKEY = 'pricer-extras-v1';   // binder card sales, other sales, expenses
const LIST_KEY = 'pricer-my-list-loaded';
let cards = load();
let extras = loadX();
let tab = 'cards', filter = '', qkind = 'binder';

function load(){ try{ return JSON.parse(localStorage.getItem(KEY)) || []; }catch(e){ return []; } }
function loadX(){ try{ return JSON.parse(localStorage.getItem(XKEY)) || []; }catch(e){ return []; } }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(cards)); localStorage.setItem(XKEY, JSON.stringify(extras)); }catch(e){ toast('Could not save on this phone'); } }
const KINDS = {binder:'Binder cards', item:'Other sale', expense:'Expense'};
const xAmt = x => x.kind==='expense' ? -x.amount : x.amount;
const xLabel = x => x.kind==='binder' ? 'Binder cards x '+(x.qty||1) : (x.label || KINDS[x.kind]);
const $ = s => document.querySelector(s);
const money = n => (n==null||isNaN(n)) ? '—' : (n<0?'-':'') + '$' + Math.abs(Number(n)).toFixed(2);
const esc = s => String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => { const n = parseFloat(String(v??'').replace(/[$,\s]/g,'')); return isNaN(n) ? null : n; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const today = () => new Date().toISOString().slice(0,10);
function toast(t){ const el=$('#toast'); el.textContent=t; el.style.display='block'; clearTimeout(toast.t); toast.t=setTimeout(()=>el.style.display='none',2200); }

// ---------- price math ----------
function soldsUsed(c){
  return (c.solds||[]).filter(s=>!s.off).sort((a,b)=>b.date.localeCompare(a.date)).slice(0, c.useLast||3);
}
function avgSolds(c){ const u=soldsUsed(c); return u.length ? u.reduce((t,s)=>t+s.price,0)/u.length : null; }
function rawPrice(c){ const p=c.prices&&c.prices[c.variant]; return p ? (p.market ?? p.mid ?? p.low ?? null) : null; }
function value(c){ if(c.override!=null) return c.override; return c.grade ? avgSolds(c) : rawPrice(c); }
function valueSource(c){
  if(c.override!=null) return 'Your price';
  if(c.grade) return soldsUsed(c).length ? 'Avg of last '+soldsUsed(c).length+' sold' : 'No solds yet';
  return rawPrice(c)!=null ? 'TCGplayer market' : 'No price yet';
}

// ---------- looking cards up ----------
async function apiSearch(name, number, setName){
  const parts = ['name:"'+name.replace(/"/g,'')+'"'];
  if(number) parts.push('number:'+String(number).split('/')[0].replace(/^0+(?=\d)/,''));
  if(setName) parts.push('set.name:"'+setName.replace(/"/g,'')+'*"');
  const url = API + '?pageSize=12&orderBy=-set.releaseDate&q=' + encodeURIComponent(parts.join(' '));
  const r = await fetch(url); if(!r.ok) throw new Error('lookup '+r.status);
  return (await r.json()).data || [];
}
function applyApi(c, d){
  c.apiId=d.id; c.name=d.name; c.setName=d.set?.name||c.setName; c.number=d.number+(d.set?.printedTotal?'/'+d.set.printedTotal:'');
  c.img=d.images?.small; c.imgBig=d.images?.large; c.tcgUrl=d.tcgplayer?.url||null;
  c.prices=d.tcgplayer?.prices||{}; c.priceDate=d.tcgplayer?.updatedAt||null;
  if(!c.variant || !c.prices[c.variant]) c.variant = Object.keys(c.prices)[0] || null;
  c.found=true;
}
async function lookup(c){
  try{
    let list = await apiSearch(c.name, c.number, c.setName);
    if(!list.length && c.setName) list = await apiSearch(c.name, c.number, '');
    if(!list.length) list = await apiSearch(c.name, '', '');
    c.choices = list.slice(0,12).map(d=>({id:d.id,img:d.images?.small,set:d.set?.name,num:d.number}));
    if(list.length){ applyApi(c, list[0]); c.check = list.length>1 && !(c.number && c.setName); }
    else { c.found=false; c.check=true; }
  }catch(e){ c.pending=true; }
}
async function refreshOne(c){
  if(!c.apiId) return lookup(c);
  const r = await fetch(API+'/'+c.apiId); if(!r.ok) throw new Error('x');
  applyApi(c, (await r.json()).data); c.pending=false;
}

// ---------- PSA cert lookup ----------
// Needs Brian's free PSA API key (psacard.com/publicapi), saved on this phone only.
function psaToken(){ try{ return localStorage.getItem(TOKEN_KEY)||''; }catch(e){ return ''; } }
function psaGrade(txt){ const m=String(txt||'').match(/(\d+(?:\.5)?)\s*$/); return m ? 'PSA '+m[1] : (txt?'PSA '+txt:''); }
async function psaLookup(c){
  const cert=String(c.cert||'').replace(/\D/g,''); if(!cert) throw new Error('Type the cert number first');
  const tok=psaToken(); if(!tok) throw new Error('Add your PSA key on the Add cards tab first');
  const r=await fetch(PSA_API+cert,{headers:{authorization:'bearer '+tok}});
  if(r.status===401||r.status===403) throw new Error('PSA did not accept the key');
  if(!r.ok) throw new Error('PSA lookup failed ('+r.status+')');
  const d=(await r.json()).PSACert; if(!d) throw new Error('PSA has no card with that cert');
  c.psa={year:d.Year,brand:d.Brand,subject:d.Subject,number:d.CardNumber,variety:d.Variety,grade:d.CardGrade,pop:d.TotalPopulation,popHigher:d.PopulationHigher,checked:today()};
  c.grade=psaGrade(d.CardGrade);
  const name=String(d.Subject||'').replace(/\b(holo|1st edition|reverse|shadowless)\b/ig,'').replace(/-\s*$/,'').trim();
  if(name && (!c.found || c.check)){ c.name=name; c.number=d.CardNumber||c.number; if(navigator.onLine) await lookup(c); }
  return c;
}

// ---------- reading a card list ----------
// One card per line: name, set, number, grade, what you paid. Commas, tabs or | between.
function parseList(text){
  const out=[];
  for(let line of text.split(/\r?\n/)){
    line=line.trim(); if(!line) continue;
    const f=line.split(/[\t|]/.test(line)?/[\t|]/:/,/).map(s=>s.trim().replace(/^"|"$/g,''));
    if(/^name$/i.test(f[0])) continue; // header row
    let [name,setName,number,grade,paid,cert]=f;
    // allow "Charizard 4/102" with nothing else
    if(f.length===1){ const m=name.match(/^(.*?)\s+#?(\d+[a-z]?(?:\/\d+)?)$/i); if(m){ name=m[1]; number=m[2]; } }
    grade=(grade||'').trim(); if(/^raw$/i.test(grade)) grade='';
    out.push({id:uid(),name,setName:setName||'',number:number||'',grade,paid:num(paid),cert:(cert||'').replace(/\D/g,''),solds:[],useLast:3,override:null,sold:null,added:today()});
  }
  return out;
}

// ---------- screens ----------
function render(){
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  $('#main').innerHTML = tab==='cards' ? cardsView() : tab==='add' ? addView() : salesView();
}
function totalsHtml(list){
  const left=list.filter(c=>!c.sold);
  const paid=left.reduce((t,c)=>t+(c.paid||0),0), val=left.reduce((t,c)=>t+(value(c)||0),0);
  const sold=list.filter(c=>c.sold), sales=sold.reduce((t,c)=>t+c.sold.price,0), soldCost=sold.reduce((t,c)=>t+(c.paid||0),0);
  return `<div class="totals">
   <div class="tot"><b>${left.length}</b><span>cards on hand</span></div>
   <div class="tot"><b>${money(val)}</b><span>worth now</span></div>
   <div class="tot"><b>${money(paid)}</b><span>you paid</span></div>
   <div class="tot"><b class="${val-paid>=0?'up':'down'}">${money(val-paid)}</b><span>profit if sold today</span></div>
   ${sold.length?`<div class="tot"><b>${money(sales)}</b><span>${sold.length} sold</span></div><div class="tot"><b class="${sales-soldCost>=0?'up':'down'}">${money(sales-soldCost)}</b><span>profit on sold</span></div>`:''}
  </div>`;
}
function rowHtml(c){
  const v=c.sold?c.sold.price:value(c), p=c.paid;
  const tags=(c.grade?`<span class="tag g">${esc(c.grade)}</span>`:`<span class="tag">Raw</span>`)
    +(c.sold?`<span class="tag s">Sold ${money(c.sold.price)}</span>`:'')
    +(c.check?`<span class="tag w">Check card</span>`:'')+(c.pending?`<span class="tag w">Look up when online</span>`:'');
  const pl = (v!=null&&p!=null)?`<span class="${v-p>=0?'up':'down'}">${v-p>=0?'+':''}${money(v-p)}</span>`:'';
  return `<div class="row" data-open="${c.id}">
    ${c.img?`<img src="${esc(c.img)}" alt="" loading="lazy">`:'<img alt="">'}
    <div class="info"><div class="nm">${esc(c.name)}</div><div class="sub">${esc(c.setName)} ${esc(c.number)}</div><div>${tags}</div></div>
    <div class="val"><b>${money(v)}</b><div class="sub">paid ${money(p)}</div>${pl}</div></div>`;
}
function cardsView(){
  if(!cards.length) return `<div class="empty"><p>No cards yet.</p><button class="big" id="mylist">Load my card list</button><button class="big ghost" data-go="add">Add your own cards</button></div>`;
  const f=filter.toLowerCase();
  const list=cards.filter(c=>!f||(c.name+' '+c.setName+' '+c.number+' '+c.grade+' '+(c.cert||'')).toLowerCase().includes(f));
  return totalsHtml(cards)+`<input class="search" id="q" placeholder="Search your cards" value="${esc(filter)}">`
    +list.map(rowHtml).join('')
    +`<button class="big ghost" id="refresh">Update all prices</button><p class="hint">Raw prices come from TCGplayer. Graded prices come from the sold prices you add to each card.</p>`;
}
function addView(){
  return `<button class="big ghost" id="mylist">Load my card list (from the card show list)</button>
  <label>Paste your card list</label>
  <p class="hint">One card per line: <b>name, set, number, grade, what you paid, PSA cert</b>. Leave grade blank for raw. Cert is optional.<br>Example:<br>Charizard, Base Set, 4/102, PSA 9, 250<br>Pikachu, Celebrations, 5/25, , 3</p>
  <textarea id="list" placeholder="Charizard, Base Set, 4/102, PSA 9, 250"></textarea>
  <button class="big" id="import">Add these cards</button>
  <p class="hint">You can also paste straight from a spreadsheet (copy the columns in that order).</p>
  <hr style="border-color:#323643;margin:22px 0">
  <label>Your PSA key (for cert look-ups)</label>
  <input id="psatoken" type="password" placeholder="Paste your PSA key" value="${esc(psaToken())}">
  <p class="hint">Free from PSA: sign in at psacard.com, open <b>publicapi</b>, and copy your access token. It stays on this phone only.</p>
  <label>Back up your cards</label><button class="big ghost" id="export">Save a backup file</button>
  <label>Load a backup</label><input type="file" id="restore" accept=".json">`;
}
const localDay = iso => { const d=new Date(iso); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
function quickHtml(){
  const k=qkind;
  return `<div class="quick"><div class="seg">${Object.entries(KINDS).map(([id,t])=>`<button data-qkind="${id}" class="${id===k?'on '+id:''}">${t}</button>`).join('')}</div>
   <div class="two">${k==='binder'
     ?`<div><label>How many cards</label><input id="qqty" inputmode="numeric" value="1"></div>`
     :`<div><label>${k==='expense'?'What you spent on':'What you sold'}</label><input id="qlabel" placeholder="${k==='expense'?'Drink, cards I bought…':'Anything'}"></div>`}
    <div><label>${k==='expense'?'You paid':'Sold for'}</label><input id="qamt" inputmode="decimal" placeholder="$"></div></div>
   <button class="big ${k==='expense'?'spend':'add'}" id="qsave">${k==='expense'?'Save expense':'Save sale'}</button></div>`;
}
function xRowHtml(x){
  const a=xAmt(x);
  return `<div class="row xrow"><div class="info"><div class="nm">${esc(xLabel(x))}</div><div class="sub">${KINDS[x.kind]} · ${new Date(x.at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</div></div>
   <div class="val"><b class="${a<0?'down':''}">${money(a)}</b></div><button class="xdel" data-xdel="${x.id}" aria-label="Remove">✕</button></div>`;
}
function salesView(){
  const days={};
  cards.filter(c=>c.sold).forEach(c=>(days[localDay(c.sold.at)]??=[]).push({at:c.sold.at,card:c}));
  extras.forEach(x=>(days[localDay(x.at)]??=[]).push({at:x.at,x}));
  const keys=Object.keys(days).sort().reverse();
  const body = keys.length ? keys.map(d=>{
    const l=days[d].sort((a,b)=>b.at.localeCompare(a.at));
    const cardSales=l.filter(e=>e.card), xs=l.filter(e=>e.x).map(e=>e.x);
    const sales=cardSales.reduce((t,e)=>t+e.card.sold.price,0)+xs.filter(x=>x.kind!=='expense').reduce((t,x)=>t+x.amount,0);
    const spent=xs.filter(x=>x.kind==='expense').reduce((t,x)=>t+x.amount,0);
    const cost=cardSales.reduce((t,e)=>t+(e.card.paid||0),0);
    return `<h3>${new Date(d+'T12:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</h3>
     <div class="totals day"><div class="tot"><b>${money(sales)}</b><span>sales</span></div><div class="tot"><b class="${spent?'down':''}">${money(-spent)}</b><span>expenses</span></div>
     <div class="tot wide"><b class="${sales-spent>=0?'up':'down'}">${money(sales-spent)}</b><span>net for the day${cost?` · tracked cards cost you ${money(cost)}`:''}</span></div></div>`
     +l.map(e=>e.card?rowHtml(e.card):xRowHtml(e.x)).join('');
  }).join('')+`<button class="big ghost" id="csv">Save sales as a spreadsheet</button>`
  : `<div class="empty">No sales yet. Tap a card in My cards, then tap <b>Sold it</b>.<br>Works with no signal.</div>`;
  return quickHtml()+body;
}

function detail(c){
  const v=value(c);
  const variants=Object.keys(c.prices||{});
  const solds=(c.solds||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  const used=new Set(soldsUsed(c));
  $('#sheetIn').innerHTML=`
  <div class="dhead">${c.imgBig||c.img?`<img src="${esc(c.imgBig||c.img)}" alt="">`:''}
   <div><h2 style="margin:0">${esc(c.name)}</h2><div class="sub">${esc(c.setName)} ${esc(c.number)}</div>
   <div style="margin:6px 0">${c.grade?`<span class="tag g">${esc(c.grade)}</span>`:'<span class="tag">Raw</span>'}</div>
   <div style="font-size:30px;font-weight:800">${money(v)}</div><div class="sub">${valueSource(c)}</div>
   <div class="sub">Paid ${money(c.paid)}${v!=null&&c.paid!=null?` · <span class="${v-c.paid>=0?'up':'down'}">${v-c.paid>=0?'+':''}${money(v-c.paid)}</span>`:''}</div></div></div>

  ${c.sold?`<p class="tag s" style="font-size:15px;margin-top:12px">Sold for ${money(c.sold.price)} on ${c.sold.at.slice(0,10)}</p><button class="big ghost" id="unsell">Undo sale</button>`
  :`<div class="three" style="margin-top:14px"><div><label>Sold it for</label><input id="sellp" inputmode="decimal" placeholder="$"></div><div></div><button id="sell" style="background:var(--green)">Sold it</button></div>`}

  <div class="two"><div><label>What you paid</label><input id="paid" inputmode="decimal" value="${c.paid??''}"></div>
  <div><label>Grade</label><input id="grade" placeholder="Raw" value="${esc(c.grade)}"></div></div>

  ${!c.grade?`${variants.length>1?`<label>Which version</label><select id="variant">${variants.map(k=>`<option value="${k}" ${k===c.variant?'selected':''}>${VARIANTS[k]||k}: ${money(c.prices[k].market??c.prices[k].mid)}</option>`).join('')}</select>`:''}
   <p class="hint">TCGplayer price${c.priceDate?' from '+esc(c.priceDate):''}.${c.tcgUrl?` <a style="color:var(--blue)" href="${esc(c.tcgUrl)}" target="_blank" rel="noopener">See on TCGplayer</a>`:''}</p>`
  :`<label>PSA cert number</label>
   <div class="three"><div><input id="cert" inputmode="numeric" value="${esc(c.cert||'')}" placeholder="From the slab label"></div><div></div><button id="psa">Look up</button></div>
   ${c.psa?`<p class="hint">PSA says: <b>${esc([c.psa.year,c.psa.brand,c.psa.subject,c.psa.number?'#'+c.psa.number:'',c.psa.variety].filter(Boolean).join(' '))}</b>, ${esc(c.psa.grade)}. Population ${esc(c.psa.pop??'—')}, ${esc(c.psa.popHigher??'—')} graded higher.</p>`:''}
   ${c.cert?`<p class="hint"><a style="color:var(--blue)" target="_blank" rel="noopener" href="https://www.psacard.com/cert/${esc(c.cert)}">Open this cert on PSA</a></p>`:''}
   <label>Recent sold prices</label>
   <p class="hint">Add the last few sold prices for this card and grade (from eBay "Sold items" or 130point). The value is the average of the newest <b>${c.useLast||3}</b> you keep switched on. Tap a sale to leave it out.</p>
   <table class="solds">${solds.map(s=>`<tr class="${s.off?'off':''}" data-soldtoggle="${s.id}"><td>${esc(s.date)}</td><td><b>${money(s.price)}</b></td><td>${esc(s.note||'')}</td><td>${used.has(s)?'✓ used':s.off?'left out':''}</td><td><span data-solddel="${s.id}" style="color:var(--red);padding:6px">✕</span></td></tr>`).join('')||'<tr><td class="sub">No sold prices yet.</td></tr>'}</table>
   <div class="three"><div><label>Sold date</label><input id="sd" type="date" value="${today()}"></div><div><label>Price</label><input id="sp" inputmode="decimal" placeholder="$"></div><button id="addsold">Add</button></div>
   <input id="sn" placeholder="Note (optional, like eBay or best offer)" style="margin-top:6px">
   <label>Average how many of the newest sales</label><select id="uselast">${[1,2,3,4,5,6,8,10].map(n=>`<option ${n===(c.useLast||3)?'selected':''}>${n}</option>`).join('')}</select>
   <a class="big ghost" style="text-align:center;text-decoration:none;color:var(--text)" target="_blank" rel="noopener" href="https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(c.name+' '+c.number.split('/')[0]+' '+c.grade)}&LH_Sold=1&LH_Complete=1">Look up solds on eBay</a>`}

  <label>Set your own price (optional)</label><input id="ovr" inputmode="decimal" placeholder="Leave blank to use ${c.grade?'the average':'TCGplayer'}" value="${c.override??''}">
  ${c.choices&&c.choices.length>1?`<label>Wrong picture? Pick the right card</label><div class="picks">${c.choices.map(x=>`<div data-pick="${x.id}"><img src="${esc(x.img)}" alt="" loading="lazy">${esc(x.set)} ${esc(x.num)}</div>`).join('')}</div>`:''}
  <button class="big" id="done">Done</button>
  <button class="big danger" id="del">Remove this card</button>`;
  $('#sheet').classList.add('on');
  const fld=(id,fn)=>{const el=$('#'+id); if(el) el.addEventListener('change',()=>{fn(el.value); save(); detail(c); render();});};
  fld('paid',v=>c.paid=num(v)); fld('grade',v=>{c.grade=/^raw$/i.test(v.trim())?'':v.trim();}); fld('variant',v=>c.variant=v);
  fld('ovr',v=>c.override=num(v)); fld('cert',v=>c.cert=v.replace(/\D/g,''));
  $('#psa')?.addEventListener('click',async()=>{ c.cert=$('#cert').value.replace(/\D/g,''); if(!navigator.onLine) return toast('Needs signal'); toast('Asking PSA…'); try{ await psaLookup(c); save(); detail(c); render(); toast('Found it on PSA'); }catch(e){ save(); toast(e.message.includes('fetch')?'PSA blocked the lookup from this app':e.message); } }); fld('uselast',v=>c.useLast=+v);
  $('#sell')?.addEventListener('click',()=>{const p=num($('#sellp').value); if(p==null) return toast('Type what it sold for'); c.sold={price:p,at:new Date().toISOString()}; save(); close(); toast('Sale saved'); });
  $('#unsell')?.addEventListener('click',()=>{c.sold=null; save(); detail(c); render();});
  $('#addsold')?.addEventListener('click',()=>{const p=num($('#sp').value); if(p==null) return toast('Type the sold price'); (c.solds??=[]).push({id:uid(),date:$('#sd').value||today(),price:p,note:$('#sn').value.trim()}); save(); detail(c); render();});
  $('#sheetIn').querySelectorAll('[data-solddel]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation(); c.solds=c.solds.filter(s=>s.id!==el.dataset.solddel); save(); detail(c); render();}));
  $('#sheetIn').querySelectorAll('[data-soldtoggle]').forEach(el=>el.addEventListener('click',()=>{const s=c.solds.find(s=>s.id===el.dataset.soldtoggle); s.off=!s.off; save(); detail(c); render();}));
  $('#sheetIn').querySelectorAll('[data-pick]').forEach(el=>el.addEventListener('click',async()=>{try{const r=await fetch(API+'/'+el.dataset.pick); applyApi(c,(await r.json()).data); c.check=false; save(); detail(c); render();}catch(e){toast('Needs signal to switch cards');}}));
  $('#done').addEventListener('click',close);
  $('#del').addEventListener('click',()=>{ if(!confirmDel(c)) return; cards=cards.filter(x=>x!==c); save(); close(); });
}
function confirmDel(c){ const b=$('#del'); if(b.dataset.sure) return true; b.dataset.sure=1; b.textContent='Tap again to remove'; return false; }
function close(){ $('#sheet').classList.remove('on'); render(); }

// Sealed product and One Piece cards are not in the Pokemon price list, so skip looking them up.
function needsLookup(c){ return !/^sealed$/i.test(c.grade||'') && !/one piece/i.test(c.name||''); }

// Background lookups only redraw the card list, so they never wipe what you are typing.
function softRender(){ if(tab==='cards' && !$('#sheet').classList.contains('on') && document.activeElement?.id!=='q') render(); }

// ---------- actions ----------
async function runLookups(list){
  let n=0;
  for(const c of list){ await lookup(c); n++; save(); softRender(); toast('Looking up '+n+' of '+list.length); await new Promise(r=>setTimeout(r,250)); }
  const off=list.filter(c=>c.pending).length;
  toast(off?off+' cards will look up when you have signal':'All cards looked up');
}
document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-tab],[data-go],[data-open],[data-qkind],[data-xdel],#import,#refresh,#export,#csv,#qsave,#mylist');
  if(!t) { if(e.target.id==='sheet') close(); return; }
  if(t.dataset.tab||t.dataset.go){ tab=t.dataset.tab||t.dataset.go; render(); return; }
  if(t.dataset.open){ detail(cards.find(c=>c.id===t.dataset.open)); return; }
  if(t.dataset.qkind){ qkind=t.dataset.qkind; render(); return; }
  if(t.dataset.xdel){ if(!t.dataset.sure){ t.dataset.sure=1; t.textContent='Remove?'; t.classList.add('sure'); return; } extras=extras.filter(x=>x.id!==t.dataset.xdel); save(); render(); toast('Removed'); return; }
  if(t.id==='qsave'){
    const amt=num($('#qamt').value); if(amt==null) return toast('Type the amount');
    const x={id:uid(),kind:qkind,amount:Math.abs(amt),at:new Date().toISOString()};
    if(qkind==='binder'){ x.qty=Math.max(1,parseInt($('#qqty').value)||1); }
    else { x.label=$('#qlabel').value.trim(); }
    extras.push(x); save(); render(); toast(qkind==='expense'?'Expense saved':'Sale saved'); return;
  }
  if(t.id==='mylist'){
    let done=false; try{ done=!!localStorage.getItem(LIST_KEY); }catch(err){}
    if(done && !t.dataset.sure){ t.dataset.sure=1; t.textContent='Already loaded. Tap again to add it again'; return; }
    try{ const r=await fetch('my-list.txt'); if(!r.ok) throw 0; const add=parseList(await r.text()); cards.push(...add); save(); try{ localStorage.setItem(LIST_KEY,today()); }catch(err){}
      tab='cards'; render(); toast(add.length+' cards added'); runLookups(add.filter(needsLookup)); }
    catch(err){ toast('Could not load the list. Try again with signal'); }
    return;
  }
  if(t.id==='import'){ const add=parseList($('#list').value); if(!add.length) return toast('Paste at least one card'); cards.push(...add); save(); tab='cards'; render(); runLookups(add.filter(needsLookup)); }
  if(t.id==='refresh'){ if(!navigator.onLine) return toast('Needs signal'); let n=0; for(const c of cards){ try{ await refreshOne(c); }catch(err){} n++; if(n%5===0){save();render();} } save(); render(); toast('Prices updated'); }
  if(t.id==='export'){ download('card-pricer-backup-'+today()+'.json', JSON.stringify({cards,extras},null,1), 'application/json'); }
  if(t.id==='csv'){ const data=cards.filter(c=>c.sold).map(c=>[localDay(c.sold.at),'Card sale',c.name,c.setName,c.number,c.grade||'Raw',1,c.paid??'',c.sold.price,c.paid!=null?(c.sold.price-c.paid).toFixed(2):''])
    .concat(extras.map(x=>[localDay(x.at),KINDS[x.kind],xLabel(x),'','','',x.qty||'','',xAmt(x).toFixed(2),''])).sort((a,b)=>a[0].localeCompare(b[0]));
    const rows=[['Date','Type','Item','Set','Number','Grade','Qty','Paid','Amount','Profit']].concat(data); download('card-sales-'+today()+'.csv', rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n'), 'text/csv'); }
});
document.addEventListener('input',e=>{ if(e.target.id==='q'){ filter=e.target.value; const pos=e.target.selectionStart; render(); const q=$('#q'); q.focus(); q.setSelectionRange(pos,pos);} });
document.addEventListener('change',async e=>{ if(e.target.id==='psatoken'){ try{ localStorage.setItem(TOKEN_KEY,e.target.value.trim()); toast('PSA key saved'); }catch(err){} return; } if(e.target.id==='restore'){ try{ const d=JSON.parse(await e.target.files[0].text()); if(Array.isArray(d)){ cards=d; } else if(d&&Array.isArray(d.cards)){ cards=d.cards; extras=Array.isArray(d.extras)?d.extras:[]; } else throw 0; save(); tab='cards'; render(); toast('Backup loaded'); }catch(err){ toast('That file did not work'); } } });
function download(name, text, type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function net(){ const n=$('#net'); n.textContent=navigator.onLine?'Online':'No signal (still works)'; n.classList.toggle('off',!navigator.onLine);
  if(navigator.onLine){ const p=cards.filter(c=>c.pending); if(p.length) runLookups(p); } }
addEventListener('online',net); addEventListener('offline',net);
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
render(); net();
if(typeof module!=='undefined') module.exports={parseList,avgSolds,soldsUsed,value,needsLookup,xAmt,xLabel};
