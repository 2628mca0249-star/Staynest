const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const express = require('express');
const { User, Room, Review, Saved, clean } = require('./db');

class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}
const bad = (msg, fields) => new HttpError(400, msg, fields);

// --- JWT secret: env var, or generated once and persisted ---
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const dir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const file = path.join(dir, '.jwt_secret');
  try { return fs.readFileSync(file, 'utf8').trim(); } catch (_) {}
  const s = crypto.randomBytes(48).toString('hex');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, s, { mode: 0o600 });
  return s;
}
const SECRET = loadSecret();
const COOKIE = 'sn_token';

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((c) => c.trim()).filter(Boolean).map((c) => {
    const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
  }));
}
function issueToken(res, user) {
  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 864e5, path: '/' });
}
function publicUser(u) {
  return u && { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, city: u.city, created_at: u.created_at };
}

// attaches req.user if a valid cookie is present
async function loadUser(req, _res, next) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) {
    try {
      const { id } = jwt.verify(token, SECRET);
      req.user = clean(await User.findOne({ id }).lean()) || null;
    } catch (e) { req.user = null; if (!/jwt|token|signature|expired/i.test(e.message)) return next(e); }
  }
  next();
}

// Express 4 does not catch rejected promises — a Router whose handlers are wrapped so async errors reach the error middleware.
function asyncRouter() {
  const router = express.Router();
  const wrap = (fn) => (typeof fn === 'function' && fn.length < 4
    ? (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next) : fn);
  for (const m of ['get', 'post', 'put', 'patch', 'delete', 'use']) {
    const orig = router[m].bind(router);
    router[m] = (...args) => orig(...args.map(wrap));
  }
  return router;
}
const requireAuth = (req, _res, next) => (req.user ? next() : next(new HttpError(401, 'Please log in to continue.')));
const requireOwner = (req, _res, next) => (req.user && req.user.role === 'owner' ? next() : next(new HttpError(403, 'Owner account required.')));

// --- validation helpers ---
const str = (v, { min = 1, max = 500, field = 'value' } = {}) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min) throw bad(`${field} is required${min > 1 ? ` (min ${min} characters)` : ''}.`, { [field]: 'required' });
  if (s.length > max) throw bad(`${field} is too long (max ${max} characters).`, { [field]: 'too long' });
  return s;
};
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const isPhone = (p) => /^[6-9]\d{9}$/.test(p);
const int = (v, def) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def; };

const ROOM_TYPES = ['Single', 'Double', 'Triple'];
const GENDERS = ['Boys', 'Girls', 'Co-ed'];
const FACILITIES = ['wifi', 'food', 'ac', 'laundry', 'parking', 'security', 'gym', 'power backup'];

// --- PG hydration: attaches rooms, rating, rent ---
const round1 = (n) => Math.round(n * 10) / 10;
async function hydratePgs(rows, userId) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [rooms, stats, savedRows] = await Promise.all([
    Room.find({ pg_id: { $in: ids } }).lean(),
    Review.aggregate([{ $match: { pg_id: { $in: ids } } }, { $group: { _id: '$pg_id', sum: { $sum: '$rating' }, n: { $sum: 1 } } }]),
    userId ? Saved.find({ user_id: userId, pg_id: { $in: ids } }).lean() : [],
  ]);
  const saved = new Set(savedRows.map((r) => r.pg_id));
  return rows.map((r) => {
    const rs = rooms.filter((x) => x.pg_id === r.id).sort((a, b) => b.price - a.price).map(({ type, price, available }) => ({ type, price, available }));
    const st = stats.find((s) => s._id === r.id);
    return {
      id: r.id, owner_id: r.owner_id, name: r.name, city: r.city, area: r.area, address: r.address, gender: r.gender,
      description: r.description, facilities: r.facilities || [], image: r.image, gallery: r.gallery || [],
      deposit: r.deposit, rules: r.rules || [], active: !!r.active, created_at: clean({ d: r.created_at }).d,
      rooms: rs, rent: rs.length ? Math.min(...rs.map((x) => x.price)) : 0,
      spots: rs.reduce((a, x) => a + x.available, 0),
      rating: st ? round1(st.sum / st.n) : null, reviews_count: st ? st.n : 0, saved: saved.has(r.id),
    };
  });
}

module.exports = { asyncRouter, round1, HttpError, bad, issueToken, publicUser, loadUser, requireAuth, requireOwner, COOKIE,
  str, isEmail, isPhone, int, hydratePgs, ROOM_TYPES, GENDERS, FACILITIES };
