// Shared online store on Supabase. Same methods as LocalStore, plus owner sign-in.
// Owners read and change only their own data (database rules in supabase/schema.sql).
// Customers never sign in: they use the get_business / submit_request / get_quote / accept_quote functions.
import { DEFAULT_SETTINGS } from './store.js?v=202611010312';

const PICK = 'shineslot:business';
const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

function fail(error) { if (error) throw new Error(error.message || 'Something went wrong. Please try again.'); }

function fromRow(row) {
  return { id: row.id, token: row.token, status: row.status, createdAt: row.created_at, quote: row.quote, history: row.history || [], ownerNote: row.owner_note || '', ...row.data };
}

const DATA_KEYS = ['name', 'phone', 'email', 'vehicle', 'services', 'times', 'address', 'notes', 'photos', 'details', 'size', 'sizePrice', 'paid'];
const pick = (obj, keys) => Object.fromEntries(keys.filter(k => k in obj).map(k => [k, obj[k]]));

export function slugify(text) {
  const s = String(text || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return s.length >= 3 ? s : (s + '-shop').replace(/^-/, '');
}

export class CloudStore {
  constructor(url, key) { this.url = url; this.key = key; this.mode = 'cloud'; this._biz = undefined; }

  async client() {
    if (!this._c) {
      const { createClient } = await import(SDK);
      this._c = createClient(this.url, this.key, { auth: { persistSession: true, detectSessionInUrl: false } });
    }
    return this._c;
  }

  // ----- owner sign-in -----
  async session() { const c = await this.client(); const { data } = await c.auth.getSession(); return data.session; }
  async signIn(email, password) { const c = await this.client(); fail((await c.auth.signInWithPassword({ email, password })).error); this._biz = this._all = undefined; }
  async signUp(email, password) {
    const c = await this.client();
    const { data, error } = await c.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }); fail(error);
    return { needsConfirm: !data.session };
  }
  async signOut() { const c = await this.client(); await c.auth.signOut(); this._biz = this._all = undefined; }

  // All businesses this login owns, oldest first.
  async businesses() {
    if (this._all) return this._all;
    const c = await this.client();
    const { data, error } = await c.from('businesses').select('id, slug, settings').order('created_at'); fail(error);
    this._all = data;
    return data;
  }
  // The business open right now (remembered on this device).
  async business() {
    if (this._biz !== undefined) return this._biz;
    const all = await this.businesses();
    let want = null; try { want = localStorage.getItem(PICK); } catch {}
    this._biz = all.find(b => b.id === want) || all[0] || null;
    return this._biz;
  }
  selectBusiness(id) { try { localStorage.setItem(PICK, id); } catch {} this._biz = undefined; }
  async createBusiness(slug, settings) {
    const c = await this.client();
    const { data: { user } } = await c.auth.getUser();
    const { data, error } = await c.from('businesses').insert({ owner: user.id, slug, settings }).select('id, slug, settings').single();
    if (error && /duplicate|unique/i.test(error.message)) throw new Error('That link name is taken. Try another.');
    fail(error);
    this._all = undefined; this.selectBusiness(data.id);
    return data;
  }

  // ----- owner data -----
  async getSettings() { const b = await this.business(); return { ...DEFAULT_SETTINGS, ...(b ? b.settings : {}) }; }
  async saveSettings(s) {
    const b = await this.business(); const c = await this.client();
    const settings = { ...b.settings, ...s };
    fail((await c.from('businesses').update({ settings }).eq('id', b.id)).error);
    b.settings = settings;
  }
  async listRequests() {
    const c = await this.client();
    const b = await this.business();
    const { data, error } = await c.from('requests').select('*').eq('business_id', b.id).order('created_at', { ascending: false }).limit(500); fail(error);
    return data.map(fromRow);
  }
  async getRequest(id) {
    const c = await this.client();
    const { data, error } = await c.from('requests').select('*').eq('id', id).maybeSingle(); fail(error);
    return data ? fromRow(data) : null;
  }
  async putRequest(req) {
    const c = await this.client();
    const { error } = await c.from('requests').update({ status: req.status, quote: req.quote, history: req.history, owner_note: req.ownerNote || null, data: pick(req, DATA_KEYS) }).eq('id', req.id);
    fail(error);
    return req;
  }
  async reset() { throw new Error('Clearing is only for demo mode.'); }

  // ----- customer side -----
  async publicBusiness(slug) {
    const c = await this.client();
    const { data, error } = await c.rpc('get_business', { p_slug: slug }); fail(error);
    return data ? { ...DEFAULT_SETTINGS, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v != null)) } : null;
  }
  async submitRequest(slug, req) {
    const c = await this.client();
    const { data, error } = await c.rpc('submit_request', { p_slug: slug, p_data: pick(req, DATA_KEYS) }); fail(error);
    return data;
  }
  async getQuote(token) {
    const c = await this.client();
    const { data, error } = await c.rpc('get_quote', { p_token: token }); fail(error);
    if (!data) return null;
    const settings = { ...DEFAULT_SETTINGS, ...Object.fromEntries(Object.entries(data.business || {}).filter(([, v]) => v != null)) };
    return { request: { status: data.status, quote: data.quote, services: [], ...data.data }, settings };
  }
  async acceptQuote(token) {
    const c = await this.client();
    fail((await c.rpc('accept_quote', { p_token: token })).error);
  }
}
