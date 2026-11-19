const { Pg, Room, Booking, Complaint, Review, User, clean, now } = require('../db');
const { asyncRouter, round1, HttpError, bad, requireAuth, requireOwner, hydratePgs } = require('../util');

const router = asyncRouter();
router.use(requireAuth, requireOwner);

const byNewest = (a, b) => b.created_at - a.created_at || b.id - a.id;
const myPgIds = (req) => Pg.find({ owner_id: req.user.id }).distinct('id');

router.get('/pgs', async (req, res) => {
  const rows = (await Pg.find({ owner_id: req.user.id }).lean()).sort(byNewest);
  res.json({ items: await hydratePgs(rows) });
});

router.get('/stats', async (req, res) => {
  const ids = await myPgIds(req);
  const [pending, open, rooms, reviews] = await Promise.all([
    Booking.countDocuments({ pg_id: { $in: ids }, status: 'pending' }),
    Complaint.countDocuments({ pg_id: { $in: ids }, status: { $ne: 'resolved' } }),
    Room.find({ pg_id: { $in: ids } }, 'available').lean(),
    Review.find({ pg_id: { $in: ids } }, 'rating').lean(),
  ]);
  res.json({ listings: ids.length, pending_requests: pending, open_complaints: open, beds_free: rooms.reduce((a, r) => a + r.available, 0),
    avg_rating: reviews.length ? round1(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) : null });
});

router.get('/bookings', async (req, res) => {
  const pgs = await Pg.find({ owner_id: req.user.id }).lean();
  const rows = (await Booking.find({ pg_id: { $in: pgs.map((p) => p.id) } }).lean())
    .sort((a, b) => (b.status === 'pending') - (a.status === 'pending') || byNewest(a, b));
  const users = await User.find({ id: { $in: [...new Set(rows.map((b) => b.user_id))] } }).lean();
  res.json({ items: rows.map((b) => ({ ...clean(b), pg_name: pgs.find((p) => p.id === b.pg_id).name, user_email: (users.find((u) => u.id === b.user_id) || {}).email })) });
});

router.patch('/bookings/:id(\\d+)', async (req, res) => {
  const b = await Booking.findOne({ id: +req.params.id }).lean();
  const pg = b && await Pg.findOne({ id: b.pg_id }).lean();
  if (!b || !pg || pg.owner_id !== req.user.id) throw new HttpError(404, 'Request not found.');
  const status = req.body.status;
  if (!['approved', 'rejected'].includes(status)) throw bad('Status must be approved or rejected.');
  if (b.status !== 'pending') throw bad('Only pending requests can be updated.');
  const note = String(req.body.owner_note || '').trim().slice(0, 300);
  // atomically claim the request (pending -> status) so concurrent clicks can't double-allocate a bed
  const claimed = await Booking.findOneAndUpdate({ id: b.id, status: 'pending' }, { status, owner_note: note, updated_at: now() }).lean();
  if (!claimed) throw bad('Only pending requests can be updated.');
  if (status === 'approved' && b.kind === 'booking' && b.room_type) {
    const r = await Room.updateOne({ pg_id: b.pg_id, type: b.room_type, available: { $gt: 0 } }, { $inc: { available: -1 } });
    if (!r.modifiedCount) {
      await Booking.updateOne({ id: b.id }, { status: 'pending', owner_note: claimed.owner_note, updated_at: claimed.updated_at }); // roll back
      throw bad(`No ${b.room_type} rooms left to allocate. Update availability first.`);
    }
  }
  res.json({ ok: true });
});

router.get('/complaints', async (req, res) => {
  const pgs = await Pg.find({ owner_id: req.user.id }).lean();
  const rows = (await Complaint.find({ pg_id: { $in: pgs.map((p) => p.id) } }).lean())
    .sort((a, b) => (a.status === 'resolved') - (b.status === 'resolved') || byNewest(a, b));
  const users = await User.find({ id: { $in: [...new Set(rows.map((c) => c.user_id))] } }).lean();
  res.json({ items: rows.map((c) => ({ ...clean(c), pg_name: pgs.find((p) => p.id === c.pg_id).name, user_name: (users.find((u) => u.id === c.user_id) || {}).name })) });
});

router.patch('/complaints/:id(\\d+)', async (req, res) => {
  const c = await Complaint.findOne({ id: +req.params.id }).lean();
  const pg = c && await Pg.findOne({ id: c.pg_id }).lean();
  if (!c || !pg || pg.owner_id !== req.user.id) throw new HttpError(404, 'Complaint not found.');
  const status = ['open', 'progress', 'resolved'].includes(req.body.status) ? req.body.status : c.status;
  const response = String(req.body.response ?? c.response).trim().slice(0, 500);
  await Complaint.updateOne({ id: c.id }, { status, response, updated_at: now() });
  res.json({ ok: true });
});

module.exports = router;
