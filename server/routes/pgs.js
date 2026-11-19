const { Pg, Room, Review, User, Saved, Booking, Complaint, nextId, clean } = require('../db');
const { asyncRouter, round1, HttpError, bad, requireAuth, requireOwner, str, int, hydratePgs, ROOM_TYPES, GENDERS, FACILITIES } = require('../util');

const router = asyncRouter();

// ---- public: filters meta + homepage stats ----
router.get('/meta', async (_req, res) => {
  const [cities, active, ratings, students, prices] = await Promise.all([
    Pg.aggregate([{ $match: { active: true } }, { $group: { _id: '$city', n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }]),
    Pg.countDocuments({ active: true }),
    Review.find({}, 'rating').lean(),
    User.countDocuments({ role: 'student' }),
    Room.find({}, 'price').lean().then((rs) => rs.map((r) => r.price)),
  ]);
  res.json({
    cities: cities.map((c) => ({ city: c._id, n: c.n })),
    stats: { pgs: active, cities: cities.length, avg_rating: ratings.length ? round1(ratings.reduce((a, r) => a + r.rating, 0) / ratings.length) : null, students,
      min_rent: prices.length ? Math.min(...prices) : 0, max_rent: prices.length ? Math.max(...prices) : 0 },
    facilities: FACILITIES,
  });
});

// ---- public: search ----
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const city = String(req.query.city || '').trim();
  const maxRent = int(req.query.maxRent, 0);
  const room = ROOM_TYPES.includes(req.query.room) ? req.query.room : '';
  const gender = GENDERS.includes(req.query.gender) ? req.query.gender : '';
  const facils = String(req.query.facilities || '').split(',').filter((f) => FACILITIES.includes(f));
  const sort = req.query.sort || 'popular';
  const page = Math.max(1, int(req.query.page, 1));
  const limit = Math.min(24, Math.max(1, int(req.query.limit, 9)));
  const onlyAvail = req.query.available === '1';

  const rows = await Pg.find({ active: true }).lean();
  let list = await hydratePgs(rows, req.user && req.user.id);

  list = list.filter((p) => {
    if (q && !(`${p.name} ${p.area} ${p.city} ${p.address}`.toLowerCase().includes(q))) return false;
    if (city && p.city.toLowerCase() !== city.toLowerCase()) return false;
    if (gender && p.gender !== gender) return false;
    if (facils.length && !facils.every((f) => p.facilities.includes(f))) return false;
    const rooms = room ? p.rooms.filter((r) => r.type === room) : p.rooms;
    if (!rooms.length) return false;
    if (maxRent && !rooms.some((r) => r.price <= maxRent)) return false;
    if (onlyAvail && !rooms.some((r) => r.available > 0)) return false;
    return true;
  });
  // when a room type is chosen, show that room's price as the headline
  if (room) list.forEach((p) => { p.rent = Math.min(...p.rooms.filter((r) => r.type === room).map((r) => r.price)); });

  const cmp = {
    rentLow: (a, b) => a.rent - b.rent,
    rentHigh: (a, b) => b.rent - a.rent,
    rating: (a, b) => (b.rating || 0) - (a.rating || 0) || b.reviews_count - a.reviews_count,
    newest: (a, b) => b.id - a.id,
    popular: (a, b) => b.reviews_count - a.reviews_count || (b.rating || 0) - (a.rating || 0),
  }[sort] || null;
  if (cmp) list.sort(cmp);

  const total = list.length;
  res.json({ total, page, pages: Math.max(1, Math.ceil(total / limit)), items: list.slice((page - 1) * limit, page * limit) });
});

// ---- public: details ----
router.get('/:id(\\d+)', async (req, res) => {
  const row = await Pg.findOne({ id: +req.params.id }).lean();
  const isOwner = req.user && row && row.owner_id === req.user.id;
  if (!row || (!row.active && !isOwner)) throw new HttpError(404, 'PG not found.');
  const uid = req.user && req.user.id;
  const [[pg], owner, reviews, similarRows] = await Promise.all([
    hydratePgs([row], uid),
    User.findOne({ id: row.owner_id }).lean(),
    Review.find({ pg_id: row.id }).sort({ created_at: -1, id: -1 }).lean(),
    Pg.find({ active: true, id: { $ne: row.id }, $or: [{ city: row.city }, { gender: row.gender }] }).lean(),
  ]);
  pg.owner = { name: owner.name, since: String(owner.created_at.getUTCFullYear()) };
  const authors = new Map((await User.find({ id: { $in: reviews.map((r) => r.user_id) } }).lean()).map((u) => [u.id, u.name]));
  pg.reviews = reviews.map((r) => ({ id: r.id, rating: r.rating, text: r.text, created_at: clean({ d: r.created_at }).d, name: authors.get(r.user_id), user_id: r.user_id }));
  pg.distribution = [5, 4, 3, 2, 1].map((n) => ({ stars: n, count: pg.reviews.filter((r) => r.rating === n).length }));
  similarRows.sort((a, b) => (b.city === row.city) - (a.city === row.city) || a.id - b.id);
  pg.similar = await hydratePgs(similarRows.slice(0, 3), uid);
  res.json(pg);
});

// ---- owner: create / update / delete ----
function parsePgBody(b) {
  const gender = GENDERS.includes(b.gender) ? b.gender : (() => { throw bad('Choose Boys, Girls or Co-ed.', { gender: 'invalid' }); })();
  const facilities = (Array.isArray(b.facilities) ? b.facilities : []).filter((f) => FACILITIES.includes(f));
  const rooms = (Array.isArray(b.rooms) ? b.rooms : []).filter((r) => ROOM_TYPES.includes(r.type));
  const seen = new Set();
  rooms.forEach((r) => {
    r.price = int(r.price, 0); r.available = Math.max(0, int(r.available, 0));
    if (r.price < 500 || r.price > 200000) throw bad(`Enter a valid monthly rent for ${r.type} rooms.`, { rooms: 'invalid' });
    if (seen.has(r.type)) throw bad('Each room type can be listed once.', { rooms: 'duplicate' });
    seen.add(r.type);
  });
  if (!rooms.length) throw bad('Add at least one room type with its rent.', { rooms: 'required' });
  const image = String(b.image || '').trim();
  if (image && !/^(https?:\/\/|\/img\/)/i.test(image)) throw bad('Image must be an http(s) URL.', { image: 'invalid' });
  return {
    name: str(b.name, { min: 3, max: 80, field: 'name' }), city: str(b.city, { max: 60, field: 'city' }), area: str(b.area, { max: 80, field: 'area' }),
    address: str(b.address, { min: 5, max: 200, field: 'address' }), gender,
    description: str(b.description, { min: 20, max: 1500, field: 'description' }), facilities, rooms,
    deposit: Math.max(0, int(b.deposit, 0)), image,
    rules: (Array.isArray(b.rules) ? b.rules : String(b.rules || '').split('\n')).map((s) => String(s).trim()).filter(Boolean).slice(0, 10),
    active: b.active === false || b.active === 0 ? 0 : 1,
  };
}
const saveRooms = async (pgId, rooms) => {
  await Room.deleteMany({ pg_id: pgId });
  if (rooms.length) await Room.insertMany(rooms.map((r) => ({ pg_id: pgId, type: r.type, price: r.price, available: r.available })));
};
const one = async (id) => (await hydratePgs([await Pg.findOne({ id }).lean()]))[0];

router.post('/', requireAuth, requireOwner, async (req, res) => {
  const d = parsePgBody(req.body);
  const id = await nextId('pgs');
  const slug = `${d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id}`;
  await Pg.create({
    id, owner_id: req.user.id, name: d.name, city: d.city, area: d.area, address: d.address, gender: d.gender, description: d.description,
    facilities: d.facilities, deposit: d.deposit, rules: d.rules, active: !!d.active,
    image: d.image || `/img/room/${slug}-0.svg`,
    gallery: d.image ? [d.image] : [0, 1, 2, 3, 4].map((n) => `/img/room/${slug}-${n}.svg`),
  });
  await saveRooms(id, d.rooms);
  res.status(201).json(await one(id));
});

async function ownPg(req) {
  const row = await Pg.findOne({ id: +req.params.id }).lean();
  if (!row) throw new HttpError(404, 'PG not found.');
  if (row.owner_id !== req.user.id) throw new HttpError(403, 'You can only manage your own listings.');
  return row;
}
router.put('/:id(\\d+)', requireAuth, requireOwner, async (req, res) => {
  const row = await ownPg(req);
  const d = parsePgBody(req.body);
  await Pg.updateOne({ id: row.id }, {
    name: d.name, city: d.city, area: d.area, address: d.address, gender: d.gender, description: d.description, facilities: d.facilities,
    image: d.image || row.image, deposit: d.deposit, rules: d.rules, active: !!d.active,
  });
  await saveRooms(row.id, d.rooms);
  res.json(await one(row.id));
});
router.patch('/:id(\\d+)/active', requireAuth, requireOwner, async (req, res) => {
  const row = await ownPg(req);
  await Pg.updateOne({ id: row.id }, { active: !!req.body.active });
  res.json({ ok: true });
});
router.delete('/:id(\\d+)', requireAuth, requireOwner, async (req, res) => {
  const row = await ownPg(req);
  // MongoDB has no ON DELETE CASCADE — remove dependent documents explicitly
  await Promise.all([Room, Saved, Booking, Review, Complaint].map((M) => M.deleteMany({ pg_id: row.id })));
  await Pg.deleteOne({ id: row.id });
  res.json({ ok: true });
});

module.exports = router;
