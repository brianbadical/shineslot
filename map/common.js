// Shared bits: price, footer address and contact link.
(function () {
  const c = window.PYOTM || {};
  // price 0 means setup is free: show the .free wording and hide the .paid wording.
  const price = c.price == null ? 49 : Number(c.price);
  document.querySelectorAll('.price').forEach((el) => { el.textContent = price; });
  document.querySelectorAll('.paid').forEach((el) => { el.hidden = price === 0; });
  document.querySelectorAll('.free').forEach((el) => { el.hidden = price !== 0; });
  const addr = document.getElementById('addr');
  if (addr && c.postalAddress) addr.textContent = c.postalAddress + '.';
  const mail = document.getElementById('mail');
  if (mail && c.contactEmail) mail.href = 'mailto:' + c.contactEmail;
  document.querySelectorAll('a.mailto').forEach((a) => { if (c.contactEmail) a.href = 'mailto:' + c.contactEmail; });
})();

// Lead data rides in the link after "#d=" so no list of businesses is ever published.
function decodeLead() {
  const m = location.hash.match(/d=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch (_) { return null; }
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

// Count that someone opened their free check (business name + day only). Never blocks the page.
function countVisit(business, checkedDay, page) {
  const c = window.PYOTM || {};
  if (!c.online || !c.countVisits || !business) return;
  try {
    fetch(c.supabaseUrl + '/rest/v1/map_visits', {
      method: 'POST',
      keepalive: true,
      headers: { apikey: c.supabaseKey, Authorization: 'Bearer ' + c.supabaseKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ business: String(business).slice(0, 120), checked_day: String(checkedDay || '').slice(0, 20), page }),
    }).catch(() => {});
  } catch (_) { /* counting is optional */ }
}
