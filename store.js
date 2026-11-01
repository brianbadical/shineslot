// Where ShineSlot keeps its data.
// LocalStore keeps everything in this browser only (demo mode). A shared online store
// (Supabase free plan) will plug in later with the same methods, so the screens don't change.

const KEY = 'shineslot:v1';

export const DEFAULT_SETTINGS = {
  trade: 'detailing',
  business: '',
  owner: '',
  area: '',
  shopAddress: '',
  intro: '',
};

function blank() { return { settings: { ...DEFAULT_SETTINGS }, requests: [] }; }

export class LocalStore {
  constructor(storage) {
    this.storage = storage;
    this.mode = 'demo';
  }
  _read() {
    try { const raw = this.storage && this.storage.getItem(KEY); return raw ? JSON.parse(raw) : blank(); }
    catch { return blank(); }
  }
  _write(data) {
    try { this.storage && this.storage.setItem(KEY, JSON.stringify(data)); }
    catch { throw new Error('Could not save on this device (storage is full or blocked). Try fewer or smaller photos.'); }
  }
  async getSettings() { return { ...DEFAULT_SETTINGS, ...this._read().settings }; }
  async saveSettings(s) { const d = this._read(); d.settings = { ...d.settings, ...s }; this._write(d); }
  async listRequests() { return this._read().requests; }
  async getRequest(id) { return this._read().requests.find(r => r.id === id) || null; }
  async putRequest(req) {
    req = { ...req, token: req.token || req.id };
    const d = this._read();
    const i = d.requests.findIndex(r => r.id === req.id);
    if (i >= 0) d.requests[i] = req; else d.requests.push(req);
    this._write(d);
    return req;
  }
  async reset() { this._write(blank()); }

  // Customer side. In demo mode the private token is just the request id.
  async publicBusiness() { return this.getSettings(); }
  async submitRequest(_slug, req) { await this.putRequest({ ...req, token: req.id }); return req.id; }
  async getQuote(token) {
    const r = this._read().requests.find(x => (x.token || x.id) === token);
    return r ? { request: r, settings: await this.getSettings() } : null;
  }
  async acceptQuote(token, applyAccept) {
    const found = await this.getQuote(token);
    if (!found) throw new Error('This request was not found.');
    await this.putRequest(applyAccept(found.request, { now: new Date().toISOString() }));
  }
  async rateJob(token, rating) {
    const found = await this.getQuote(token);
    if (!found || found.request.rating) throw new Error('This job was already rated.');
    await this.putRequest({ ...found.request, rating: { ...rating, at: new Date().toISOString() } });
  }
  // Owner sign-in does not exist in demo mode.
  async session() { return { demo: true }; }
  async business() { return { slug: 'demo' }; }
}

export function newId() {
  const a = new Uint8Array(6);
  globalThis.crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}
