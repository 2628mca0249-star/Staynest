const { Pg, Room, Saved, Booking, Review, Complaint, nextId, clean, now } = require('../db');
const { asyncRouter, HttpError, bad, requireAuth, str, isPhone, hydratePgs, ROOM_TYPES } = require('../util');

const router = asyncRouter();
router.use(requireAuth);

const byNewest = (a, b) => b.created_at - a.created_at || b.id - a.id;
const pgMap = async (ids) => new Map((await Pg.find({ id: { $in: [...new Set(ids)] } }).lean()).map((p) => [p.id, p]));

// ---------- saved ----------
router.get('/saved', async (req, res) => {
  const saved = await Saved.find({ user_id: req.user.id }).sort({ created_at: -1 }).lean();
  const pgs = await pgMap(saved.map((s) => s.pg_id));
  const rows = saved.map((s) => pgs.get(s.pg_id)).filter((p) => p && p.active);
  res.json({ items: await hydratePgs(rows, req.user.id) });
});
router.put('/saved/:pgId(\\d+)', async (req, res) => {
  const pgId = +req.params.pgId;
  if (!(await Pg.exists({ id: pgId }))) throw new HttpError(404, 'PG not found.');
  await Saved.updateOne({ user_id: req.user.id, pg_id: pgId }, { $setOnInsert: { created_at: now() } }, { upsert: true });
  res.json({ saved: true });
});
router.delete('/saved/:pgId(\\d+)', async (req, res) => {
  await Saved.deleteOne({ user_id: req.user.id, pg_id: +req.params.pgId });
  res.json({ saved: false });
});

// ---------- bookings / inquiries ----------
router.get('/bookings', async (req, res) => {
  const rows = (await Booking.find({ user_id: req.user.id }).lean()).sort(byNewest);
  const pgs = await pgMap(rows.map((b) => b.pg_id));
  const rooms = await Room.find({ pg_id: { $in: [...pgs.keys()] } }).lean();
  res.json({ items: rows.map((b) => {
    const p = pgs.get(b.pg_id) || {};
    const r = rooms.find((x) => x.pg_id === b.pg_id && x.type === b.room_type);
    return { ...clean(b), pg_name: p.name, pg_city: p.city, pg_area: p.area, pg_image: p.image, price: r ? r.price : null };
  }) });
});

router.post('/bookings', async (req, res) => {
  if (req.user.role === 'owner') throw new HttpError(403, 'Owner accounts cannot send booking requests. Use a student account.');
  const pg = await Pg.findOne({ id: Number.isInteger(+req.body.pg_id) ? +req.body.pg_id : -1, active: true }).lean();
  if (!pg) throw new HttpError(404, 'PG not found.');
  const kind = req.body.kind === 'inquiry' ? 'inquiry' : 'booking';
  const name = str(req.body.name, { min: 2, max: 60, field: 'name' });
  const phone = String(req.body.phone || '').trim();
  if (!isPhone(phone)) throw bad('Enter a valid 10-digit mobile number.', { phone: 'invalid' });
  const message = String(req.body.message || '').trim().slice(0, 600);
  let room_type = null, move_in = null;
  if (kind === 'booking') {
    room_type = req.body.room_type;
    if (!ROOM_TYPES.includes(room_type)) throw bad('Choose a room type.', { room_type: 'required' });
    const room = await Room.findOne({ pg_id: pg.id, type: room_type }).lean();
    if (!room) throw bad('That room type is not offered here.', { room_type: 'invalid' });
    if (room.available < 1) throw bad(`${room_type} rooms are currently full.`, { room_type: 'full' });
    move_in = String(req.body.move_in || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(move_in) || move_in < new Date().toISOString().slice(0, 10)) throw bad('Pick a move-in date from today onwards.', { move_in: 'invalid' });
    const dup = await Booking.exists({ user_id: req.user.id, pg_id: pg.id, kind: 'booking', status: { $in: ['pending', 'approved'] } });
    if (dup) throw new HttpError(409, 'You already have an active booking request for this PG.');
  } else if (message.length < 3) throw bad('Write a short message for the owner.', { message: 'required' });
  const id = await nextId('bookings');
  await Booking.create({ id, user_id: req.user.id, pg_id: pg.id, kind, room_type, move_in, name, phone, message });
  res.status(201).json({ id });
});

router.patch('/bookings/:id(\\d+)/cancel', async (req, res) => {
  const b = await Booking.findOne({ id: +req.params.id, user_id: req.user.id }).lean();
  if (!b) throw new HttpError(404, 'Request not found.');
  // atomic status flip: only one concurrent cancel can win, so the bed is released exactly once
  const won = await Booking.findOneAndUpdate({ id: b.id, status: { $in: ['pending', 'approved'] } }, { status: 'cancelled', updated_at: now() }, { new: false }).lean();
  if (!won) throw bad('This request can no longer be cancelled.');
  if (won.status === 'approved' && won.room_type) await Room.updateOne({ pg_id: won.pg_id, type: won.room_type }, { $inc: { available: 1 } });
  res.json({ ok: true });
});

// ---------- complaints ----------
router.get('/complaints', async (req, res) => {
  const rows = (await Complaint.find({ user_id: req.user.id }).lean()).sort(byNewest);
  const pgs = await pgMap(rows.map((c) => c.pg_id));
  res.json({ items: rows.map((c) => ({ ...clean(c), pg_name: (pgs.get(c.pg_id) || {}).name })) });
});
router.post('/complaints', async (req, res) => {
  if (req.user.role === 'owner') throw new HttpError(403, 'Only students can raise complaints.');
  const pgId = Number.isInteger(+req.body.pg_id) ? +req.body.pg_id : -1;
  if (!(await Pg.exists({ id: pgId }))) throw bad('Choose the PG this complaint is about.', { pg_id: 'required' });
  const categories = ['Maintenance', 'Safety & security', 'Billing & deposit', 'Food & mess', 'Other'];
  const category = categories.includes(req.body.category) ? req.body.category : 'Other';
  const subject = str(req.body.subject, { min: 4, max: 100, field: 'subject' });
  const details = str(req.body.details, { min: 10, max: 1000, field: 'details' });
  const id = await nextId('complaints');
  await Complaint.create({ id, user_id: req.user.id, pg_id: pgId, subject, category, details });
  res.status(201).json({ id });
});

// ---------- summary counts for dashboard ----------
router.get('/summary', async (req, res) => {
  const u = req.user.id;
  const [saved, open_complaints, reviews, bookings] = await Promise.all([
    Saved.countDocuments({ user_id: u }),
    Complaint.countDocuments({ user_id: u, status: { $ne: 'resolved' } }),
    Review.countDocuments({ user_id: u }),
    Booking.countDocuments({ user_id: u, status: { $in: ['pending', 'approved'] } }),
  ]);
  res.json({ saved, open_complaints, reviews, bookings });
});

router.get('/my-reviews', async (req, res) => {
  const rows = (await Review.find({ user_id: req.user.id }).lean()).sort(byNewest);
  const pgs = await pgMap(rows.map((r) => r.pg_id));
  res.json({ items: rows.map((r) => ({ ...clean(r), pg_name: (pgs.get(r.pg_id) || {}).name })) });
});

module.exports = router;
