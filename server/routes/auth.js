const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { User, nextId, clean } = require('../db');
const { asyncRouter, HttpError, bad, issueToken, publicUser, requireAuth, str, isEmail, isPhone, COOKIE } = require('../util');

const router = asyncRouter();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: process.env.NODE_ENV === 'test' ? 10000 : 40, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' } });

router.post('/signup', limiter, async (req, res) => {
  const name = str(req.body.name, { min: 2, max: 60, field: 'name' });
  const email = str(req.body.email, { max: 120, field: 'email' }).toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');
  const role = req.body.role === 'owner' ? 'owner' : 'student';
  if (!isEmail(email)) throw bad('Enter a valid email address.', { email: 'invalid' });
  if (!isPhone(phone)) throw bad('Enter a valid 10-digit Indian mobile number.', { phone: 'invalid' });
  if (password.length < 8) throw bad('Password must be at least 8 characters.', { password: 'too short' });
  const taken = () => new HttpError(409, 'An account with this email already exists.', { email: 'taken' });
  if (await User.exists({ email })) throw taken();
  let user;
  try {
    user = clean((await User.create({ id: await nextId('users'), name, email, phone, password_hash: bcrypt.hashSync(password, 10), role })).toObject());
  } catch (e) { throw e.code === 11000 ? taken() : e; }
  issueToken(res, user);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', limiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = clean(await User.findOne({ email }).lean());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) throw new HttpError(401, 'Incorrect email or password.');
  issueToken(res, user);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (_req, res) => { res.clearCookie(COOKIE, { path: '/' }); res.json({ ok: true }); });

router.get('/me', (req, res) => res.json({ user: publicUser(req.user) || null }));

router.patch('/me', requireAuth, async (req, res) => {
  const name = str(req.body.name, { min: 2, max: 60, field: 'name' });
  const phone = String(req.body.phone || '').trim();
  if (phone && !isPhone(phone)) throw bad('Enter a valid 10-digit Indian mobile number.', { phone: 'invalid' });
  const city = String(req.body.city || '').trim().slice(0, 60);
  const user = await User.findOneAndUpdate({ id: req.user.id }, { name, phone: phone || null, city: city || null }, { new: true }).lean();
  res.json({ user: publicUser(clean(user)) });
});

router.post('/password', requireAuth, limiter, async (req, res) => {
  const { current, next } = req.body;
  if (!bcrypt.compareSync(String(current || ''), req.user.password_hash)) throw new HttpError(400, 'Current password is incorrect.', { current: 'wrong' });
  if (String(next || '').length < 8) throw bad('New password must be at least 8 characters.', { next: 'too short' });
  await User.updateOne({ id: req.user.id }, { password_hash: bcrypt.hashSync(next, 10) });
  res.json({ ok: true });
});

module.exports = router;
