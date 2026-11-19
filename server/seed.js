const bcrypt = require('bcryptjs');
const { connect, disconnect, nextId, Counter, User, Pg, Room, Saved, Booking, Review, Complaint, Contact } = require('./db');

const PGS = [
  { name: 'Marigold Nest PG', city: 'Bengaluru', area: 'Koramangala', address: '12th Cross, Koramangala 4th Block, Bengaluru', gender: 'Girls', deposit: 15000, owner: 0,
    rooms: { Single: [12500, 2], Double: [9500, 5], Triple: [7500, 0] }, facilities: ['wifi', 'food', 'laundry', 'security', 'power backup'],
    description: 'A sunlit PG two minutes from the metro, popular with working women and postgrad students. Home-style meals twice a day and a rooftop common area.', rules: ['Gate closes at 10:30 PM', 'No overnight guests', 'Visitors allowed in common area till 8 PM'] },
  { name: 'Blue Trunk Boys PG', city: 'Pune', area: 'Kothrud', address: 'Paud Road, Kothrud, Pune', gender: 'Boys', deposit: 10000, owner: 1,
    rooms: { Single: [10000, 1], Double: [7000, 3], Triple: [5500, 4] }, facilities: ['wifi', 'food', 'parking', 'power backup'],
    description: 'Budget-friendly PG close to two engineering colleges, with a study room and 24/7 power backup for exam season.', rules: ['Quiet hours 11 PM – 6 AM', 'No smoking on premises'] },
  { name: 'Sage & Spice Co-living', city: 'Bengaluru', area: 'HSR Layout', address: '27th Main, HSR Layout Sector 2, Bengaluru', gender: 'Co-ed', deposit: 25000, owner: 0,
    rooms: { Single: [15000, 3], Double: [11000, 2] }, facilities: ['wifi', 'food', 'ac', 'laundry', 'security', 'gym', 'power backup'],
    description: 'A modern co-living space with AC rooms, a small gym and a weekend community breakfast. Popular with young professionals.', rules: ['Separate floors for men and women', 'Guests need prior registration'] },
  { name: 'Riverside Girls Hostel', city: 'Mumbai', area: 'Andheri West', address: 'Veera Desai Road, Andheri West, Mumbai', gender: 'Girls', deposit: 20000, owner: 1,
    rooms: { Single: [18000, 0], Double: [13500, 1], Triple: [10500, 6] }, facilities: ['wifi', 'food', 'security', 'laundry'],
    description: 'Well-secured hostel with CCTV and a warden on every floor. Five-minute walk to Andheri station.', rules: ['Biometric entry', 'Curfew 10 PM'] },
  { name: 'Campus Corner PG', city: 'Indore', area: 'Vijay Nagar', address: 'Near IET-DAVV, Vijay Nagar, Indore', gender: 'Boys', deposit: 6000, owner: 1,
    rooms: { Double: [6000, 8], Triple: [4800, 5] }, facilities: ['wifi', 'food', 'parking'],
    description: 'No-frills PG right opposite campus, favoured by first-year students for the price and the mess food.', rules: ['Mess timings fixed', 'Rent due by the 5th'] },
  { name: 'Harbour View Co-living', city: 'Chennai', area: 'Adyar', address: 'Gandhi Nagar Main Road, Adyar, Chennai', gender: 'Co-ed', deposit: 18000, owner: 0,
    rooms: { Single: [13800, 4], Double: [10200, 3] }, facilities: ['wifi', 'food', 'ac', 'security', 'laundry'],
    description: 'Quiet, tree-lined street stay with a strong focus on food quality — a resident chef runs the kitchen.', rules: ['Guests till 9 PM', 'Weekly housekeeping'] },
  { name: 'Scholars Den', city: 'Delhi', area: 'Mukherjee Nagar', address: 'Gali 4, Mukherjee Nagar, Delhi', gender: 'Boys', deposit: 8000, owner: 1,
    rooms: { Single: [9000, 2], Double: [6500, 6], Triple: [5000, 3] }, facilities: ['wifi', 'food', 'power backup', 'security'],
    description: 'Built for competitive-exam aspirants: silent reading hall open 24 hours, tiffin-style meals and a library partner nearby.', rules: ['Silence in study hall', 'No loud music'] },
  { name: 'Lotus Ladies PG', city: 'Hyderabad', area: 'Madhapur', address: 'Ayyappa Society, Madhapur, Hyderabad', gender: 'Girls', deposit: 12000, owner: 0,
    rooms: { Single: [11000, 2], Double: [8200, 4], Triple: [6400, 2] }, facilities: ['wifi', 'food', 'ac', 'laundry', 'security'],
    description: 'Safe, homely PG a short walk from HITEC City, with CCTV, a lady warden and healthy South-Indian meals.', rules: ['Curfew 10:30 PM', 'ID proof mandatory'] },
  { name: 'The Study Loft', city: 'Kolkata', area: 'Salt Lake', address: 'Sector V, Salt Lake, Kolkata', gender: 'Co-ed', deposit: 9000, owner: 1,
    rooms: { Single: [8800, 3], Double: [6200, 5] }, facilities: ['wifi', 'food', 'power backup', 'laundry'],
    description: 'Bright co-living lofts with reading nooks, close to IT offices and universities. Bengali home cooking on weekdays.', rules: ['Registered guests only', 'Quiet hours after 11 PM'] },
  { name: 'Orchid Heights PG', city: 'Pune', area: 'Viman Nagar', address: 'Lane 6, Viman Nagar, Pune', gender: 'Girls', deposit: 14000, owner: 0,
    rooms: { Single: [12000, 1], Double: [8800, 3] }, facilities: ['wifi', 'food', 'ac', 'security', 'parking', 'gym'],
    description: 'Premium girls PG with AC rooms, a small gym and an in-house cafe. Walking distance to the airport road bus hub.', rules: ['Curfew 11 PM', 'No cooking in rooms'] },
  { name: 'Urban Bunk Hostel', city: 'Mumbai', area: 'Powai', address: 'Hiranandani Gardens, Powai, Mumbai', gender: 'Boys', deposit: 15000, owner: 1,
    rooms: { Double: [11500, 3], Triple: [8900, 5] }, facilities: ['wifi', 'food', 'ac', 'laundry', 'parking'],
    description: 'Clean, well-run hostel five minutes from IIT Bombay with high-speed fibre and a common TV lounge.', rules: ['No alcohol', 'Rent due on the 1st'] },
  { name: 'Green Gate PG', city: 'Indore', area: 'Bhawarkuan', address: 'Near Bhawarkuan Square, Indore', gender: 'Co-ed', deposit: 5000, owner: 1,
    rooms: { Single: [7000, 2], Double: [5200, 6], Triple: [4200, 4] }, facilities: ['wifi', 'food', 'security', 'parking'],
    description: 'Affordable co-ed PG with separate wings, popular among coaching-institute students. Tiffin and mess both available.', rules: ['Separate wings', 'Gate closes at 10 PM'] },
];

const REVIEW_TEXTS = [
  [5, 'Warden is friendly and the food is genuinely home-style. Never had a safety issue in the months I stayed here.'],
  [4, 'Great location. Wi-Fi drops occasionally in the evenings but otherwise very comfortable.'],
  [5, 'Best PG I have stayed in — clean rooms, honest owner and no surprise charges at checkout.'],
  [4, 'Rooms are neat and the mess food is decent. Hot water in the mornings could be better.'],
  [3, 'Okay for the price. Common bathrooms get crowded around 8 AM, rest is fine.'],
  [5, 'Felt safe and looked after. Owner responds quickly whenever something needs fixing.'],
];

async function seed({ reset = false } = {}) {
  if (reset) {
    await Promise.all([Complaint, Booking, Review, Saved, Room, Pg, User, Counter, Contact].map((M) => M.deleteMany({})));
  }
  if (await User.countDocuments() > 0) return false;

  const hash = (p) => bcrypt.hashSync(p, 10);
  const addUser = async (name, email, phone, pw, role, city) => {
    const id = await nextId('users');
    await User.create({ id, name, email, phone, password_hash: hash(pw), role, city });
    return id;
  };
  const owners = [
    await addUser('Meera Kapoor', 'owner@staynest.in', '9876500001', 'owner1234', 'owner', 'Bengaluru'),
    await addUser('Rajesh Nair', 'owner2@staynest.in', '9876500002', 'owner1234', 'owner', 'Pune'),
  ];
  const demo = await addUser('Aarav Mehta', 'demo@staynest.in', '9876500010', 'demo1234', 'student', 'Bengaluru');
  const students = [demo];
  const names = ['Ananya Rao', 'Priya Sharma', 'Rohit Kumar', 'Sanya Malhotra', 'Karan Joshi', 'Isha Verma'];
  for (const [i, n] of names.entries()) students.push(await addUser(n, `student${i + 1}@staynest.in`, `98765000${20 + i}`, 'student1234', 'student', 'Pune'));

  for (const [i, p] of PGS.entries()) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const pgId = await nextId('pgs');
    await Pg.create({
      id: pgId, owner_id: owners[p.owner], name: p.name, city: p.city, area: p.area, address: p.address, gender: p.gender,
      description: p.description, facilities: p.facilities, image: `/img/room/${slug}-0.svg`,
      gallery: [0, 1, 2, 3, 4].map((n) => `/img/room/${slug}-${n}.svg`), deposit: p.deposit, rules: p.rules,
      created_at: new Date(Date.UTC(2026, 0, 1 + i, 9)), // stable, increasing order like the old autoincrement ids
    });
    await Room.insertMany(Object.entries(p.rooms).map(([type, [price, available]]) => ({ pg_id: pgId, type, price, available })));
    // 2–5 reviews each, from different students
    const n = 2 + (i % 4);
    for (let k = 0; k < n; k++) {
      const [rating, text] = REVIEW_TEXTS[(i + k) % REVIEW_TEXTS.length];
      const day = String(1 + ((i * 3 + k * 5) % 27)).padStart(2, '0');
      await Review.create({ id: await nextId('reviews'), pg_id: pgId, user_id: students[1 + ((i + k) % (students.length - 1))], rating, text,
        created_at: new Date(`2026-0${5 + (k % 5)}-${day}T10:00:00Z`) });
    }
  }

  // demo data for the demo student
  await Saved.create([{ user_id: demo, pg_id: 1 }, { user_id: demo, pg_id: 3 }]);
  await Booking.create({ id: await nextId('bookings'), user_id: demo, pg_id: 3, kind: 'booking', room_type: 'Double', move_in: '2026-12-01',
    name: 'Aarav Mehta', phone: '9876500010', message: 'Looking to move in at the start of December.', status: 'approved' });
  await Complaint.create({ id: await nextId('complaints'), user_id: demo, pg_id: 1, subject: 'Water heater not working', category: 'Maintenance',
    details: 'The geyser on the 2nd floor has not worked for 3 days.', status: 'progress', response: 'Technician scheduled for tomorrow morning.' });
  await Complaint.create({ id: await nextId('complaints'), user_id: demo, pg_id: 1, subject: 'Wi-Fi router needs replacement', category: 'Maintenance',
    details: 'Router keeps restarting every hour.', status: 'resolved', response: 'Router replaced on 28 July.' });
  return true;
}

module.exports = seed;

if (require.main === module) {
  const reset = process.argv.includes('--reset');
  connect().then(() => seed({ reset })).then((done) => console.log(done ? 'Database seeded.' : 'Database already has data (use --reset to wipe).'))
    .catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(disconnect);
}
