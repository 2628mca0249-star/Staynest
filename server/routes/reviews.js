const { Pg, Review, User, nextId, clean, now } = require('../db');
const { asyncRouter, HttpError, bad, requireAuth, str, int } = require('../util');

const router = asyncRouter();

router.post('/pgs/:id(\\d+)/reviews', requireAuth, async (req, res) => {
  const pg = await Pg.findOne({ id: +req.params.id, active: true }).lean();
  if (!pg) throw new HttpError(404, 'PG not found.');
  if (pg.owner_id === req.user.id) throw new HttpError(403, 'You cannot review your own listing.');
  const rating = int(req.body.rating, 0);
  if (rating < 1 || rating > 5) throw bad('Choose a rating from 1 to 5.', { rating: 'invalid' });
  const text = str(req.body.text, { min: 10, max: 800, field: 'review' });
  // one review per (PG, user): update in place, otherwise insert with a fresh id
  const upd = await Review.updateOne({ pg_id: pg.id, user_id: req.user.id }, { rating, text, created_at: now() });
  if (!upd.matchedCount) {
    try { await Review.create({ id: await nextId('reviews'), pg_id: pg.id, user_id: req.user.id, rating, text }); }
    catch (e) { if (e.code !== 11000) throw e; await Review.updateOne({ pg_id: pg.id, user_id: req.user.id }, { rating, text, created_at: now() }); }
  }
  res.status(201).json({ ok: true });
});

router.delete('/reviews/:id(\\d+)', requireAuth, async (req, res) => {
  const r = await Review.findOne({ id: +req.params.id }).lean();
  if (!r) throw new HttpError(404, 'Review not found.');
  if (r.user_id !== req.user.id) throw new HttpError(403, 'You can only delete your own reviews.');
  await Review.deleteOne({ id: r.id });
  res.json({ ok: true });
});

// recent reviews feed for homepage
router.get('/reviews/recent', async (_req, res) => {
  const activeIds = await Pg.find({ active: true }).distinct('id');
  const rows = await Review.find({ rating: { $gte: 4 }, pg_id: { $in: activeIds } }).sort({ created_at: -1 }).limit(6).lean();
  const [users, pgs] = await Promise.all([
    User.find({ id: { $in: rows.map((r) => r.user_id) } }).lean(),
    Pg.find({ id: { $in: rows.map((r) => r.pg_id) } }).lean(),
  ]);
  res.json({ items: rows.map((r) => {
    const p = pgs.find((x) => x.id === r.pg_id);
    return { rating: r.rating, text: r.text, created_at: clean({ d: r.created_at }).d, name: users.find((u) => u.id === r.user_id).name, pg_name: p.name, pg_id: p.id, city: p.city };
  }) });
});

module.exports = router;
