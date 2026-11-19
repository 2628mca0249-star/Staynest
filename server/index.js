const path = require('path');
const express = require('express');
const helmet = require('helmet');
const { connect, Contact } = require('./db');
const seed = require('./seed');
const { roomSvg } = require('./images');
const { HttpError, loadUser } = require('./util');

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use(express.json({ limit: '100kb' }));
app.use(loadUser);

// generated room illustrations: /img/room/<slug>-<n>.svg
app.get('/img/room/:name.svg', (req, res) => {
  res.type('image/svg+xml').set('Cache-Control', 'public, max-age=86400').send(roomSvg(req.params.name));
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pgs', require('./routes/pgs'));
app.use('/api/me', require('./routes/user'));
app.use('/api/owner', require('./routes/owner'));
app.use('/api', require('./routes/reviews'));
app.post('/api/contact', require('express-rate-limit')({ windowMs: 3600e3, limit: process.env.NODE_ENV === 'test' ? 1000 : 10, message: { error: 'Too many messages. Try again later.' } }), (req, res, next) => (async () => {
  const { str, isEmail, bad } = require('./util');
  const name = str(req.body.name, { min: 2, max: 60, field: 'name' });
  const email = str(req.body.email, { max: 120, field: 'email' });
  if (!isEmail(email)) throw bad('Enter a valid email address.', { email: 'invalid' });
  const message = str(req.body.message, { min: 10, max: 1000, field: 'message' });
  await Contact.create({ name, email, message });
  res.status(201).json({ ok: true });
})().catch(next));
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Endpoint not found.')));

app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'], maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.use((_req, res) => res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  if (!req.path.startsWith('/api')) return res.status(status).send(status === 500 ? 'Server error' : err.message);
  res.status(status).json({ error: status === 500 ? 'Something went wrong on our side.' : err.message, fields: err.fields });
});

// connect to MongoDB (and seed demo data in dev / when SEED=1)
app.init = async () => {
  await connect();
  if (process.env.NODE_ENV !== 'production' || process.env.SEED === '1') await seed();
};

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.init().then(() => app.listen(port, () => console.log(`StayNest running → http://localhost:${port}`)))
    .catch((e) => { console.error('Could not start — is MongoDB running? Check MONGODB_URI.\n', e.message); process.exit(1); });
}
module.exports = app;
