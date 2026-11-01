// Shared bits: price, footer address and contact link.
(function () {
  const c = window.PYOTM || {};
  document.querySelectorAll('.price').forEach((el) => { el.textContent = c.price || 99; });
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
