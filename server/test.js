// End-to-end API tests: `npm test` (uses a temporary database)
const os = require('os'), path = require('path'), fs = require('fs'), assert = require('assert');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'staynest-'));
process.env.DATA_DIR = dir; process.env.NODE_ENV = 'test';
// uses a throwaway database on the MongoDB at MONGODB_URI_TEST (default: local mongod) and drops it afterwards
const testDb = 'staynest_test_' + Date.now();
process.env.MONGODB_URI = (process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017').replace(/\/$/, '') + '/' + testDb;
const app = require('./index');

let base, passed = 0;
const jar = () => { let c = ''; return async (method, url, body) => {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', cookie: c }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) c = sc.split(';')[0].includes('=;') || /Expires=Thu, 01 Jan 1970/.test(sc) ? '' : sc.split(';')[0];
  let j = null; try { j = await r.json(); } catch (_) {} return { s: r.status, j };
}; };
const t = async (name, fn) => { try { await fn(); passed++; console.log('  ✓', name); } catch (e) { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; } };

app.init().then(() => {
const server = app.listen(0, async () => {
  base = 'http://127.0.0.1:' + server.address().port;
  const anon = jar(), stu = jar(), own = jar(), own2 = jar();
  const future = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);

  await t('public search + filters', async () => {
    let r = await anon('GET', '/api/pgs'); assert.equal(r.s, 200); assert.ok(r.j.total >= 10);
    r = await anon('GET', '/api/pgs?city=Pune&gender=Girls'); assert.ok(r.j.items.every((p) => p.city === 'Pune' && p.gender === 'Girls'));
    r = await anon('GET', '/api/pgs?maxRent=6000&room=Triple'); assert.ok(r.j.items.every((p) => p.rooms.some((x) => x.type === 'Triple' && x.price <= 6000)));
    r = await anon('GET', '/api/pgs?facilities=gym,ac'); assert.ok(r.j.items.every((p) => p.facilities.includes('gym') && p.facilities.includes('ac')));
    r = await anon('GET', '/api/pgs?sort=rentLow'); const rents = r.j.items.map((p) => p.rent); assert.deepEqual(rents, [...rents].sort((a, b) => a - b));
  });
  await t('pg detail + 404', async () => {
    let r = await anon('GET', '/api/pgs/1'); assert.equal(r.s, 200); assert.ok(r.j.rooms.length && r.j.reviews.length && r.j.similar.length);
    r = await anon('GET', '/api/pgs/9999'); assert.equal(r.s, 404);
  });
  await t('auth: validation, signup, duplicate, login, me, logout', async () => {
    let r = await anon('POST', '/api/auth/signup', { name: 'A', email: 'bad', phone: '1', password: '1' }); assert.equal(r.s, 400);
    r = await stu('POST', '/api/auth/signup', { name: 'Test Student', email: 'T@Example.com', phone: '9123456789', password: 'password1' }); assert.equal(r.s, 201); assert.equal(r.j.user.role, 'student');
    r = await anon('POST', '/api/auth/signup', { name: 'Test Student', email: 't@example.com', phone: '9123456789', password: 'password1' }); assert.equal(r.s, 409);
    r = await stu('GET', '/api/auth/me'); assert.equal(r.j.user.email, 't@example.com');
    r = await anon('POST', '/api/auth/login', { email: 't@example.com', password: 'wrongpass' }); assert.equal(r.s, 401);
    r = await own('POST', '/api/auth/login', { email: 'owner@staynest.in', password: 'owner1234' }); assert.equal(r.s, 200); assert.equal(r.j.user.role, 'owner');
    r = await own2('POST', '/api/auth/login', { email: 'owner2@staynest.in', password: 'owner1234' }); assert.equal(r.s, 200);
    r = await anon('GET', '/api/auth/me'); assert.equal(r.j.user, null);
  });
  await t('protected routes need auth/role', async () => {
    assert.equal((await anon('GET', '/api/me/bookings')).s, 401);
    assert.equal((await stu('GET', '/api/owner/pgs')).s, 403);
    assert.equal((await stu('POST', '/api/pgs', {})).s, 403);
  });
  await t('saved toggle', async () => {
    assert.equal((await stu('PUT', '/api/me/saved/1')).s, 200);
    let r = await stu('GET', '/api/me/saved'); assert.equal(r.j.items.length, 1);
    r = await stu('GET', '/api/pgs/1'); assert.equal(r.j.saved, true);
    await stu('DELETE', '/api/me/saved/1'); r = await stu('GET', '/api/me/saved'); assert.equal(r.j.items.length, 0);
  });
  await t('booking flow: validate, create, duplicate, approve decrements, cancel restores', async () => {
    let r = await stu('POST', '/api/me/bookings', { pg_id: 1, kind: 'booking', name: 'T', phone: '9123456789', room_type: 'Triple', move_in: future }); assert.equal(r.s, 400, 'full room rejected');
    r = await stu('POST', '/api/me/bookings', { pg_id: 1, kind: 'booking', name: 'Test Student', phone: '12', room_type: 'Double', move_in: future }); assert.equal(r.s, 400);
    r = await stu('POST', '/api/me/bookings', { pg_id: 1, kind: 'booking', name: 'Test Student', phone: '9123456789', room_type: 'Double', move_in: '2020-01-01' }); assert.equal(r.s, 400);
    r = await stu('POST', '/api/me/bookings', { pg_id: 1, kind: 'booking', name: 'Test Student', phone: '9123456789', room_type: 'Double', move_in: future, message: 'hi' }); assert.equal(r.s, 201);
    const id = r.j.id;
    r = await stu('POST', '/api/me/bookings', { pg_id: 1, kind: 'booking', name: 'Test Student', phone: '9123456789', room_type: 'Double', move_in: future }); assert.equal(r.s, 409);
    assert.equal((await own2('PATCH', '/api/owner/bookings/' + id, { status: 'approved' })).s, 404, 'other owner blocked');
    const before = (await anon('GET', '/api/pgs/1')).j.rooms.find((x) => x.type === 'Double').available;
    r = await own('PATCH', '/api/owner/bookings/' + id, { status: 'approved', owner_note: 'Welcome' }); assert.equal(r.s, 200);
    assert.equal((await anon('GET', '/api/pgs/1')).j.rooms.find((x) => x.type === 'Double').available, before - 1);
    r = await stu('PATCH', `/api/me/bookings/${id}/cancel`); assert.equal(r.s, 200);
    assert.equal((await anon('GET', '/api/pgs/1')).j.rooms.find((x) => x.type === 'Double').available, before);
    r = await stu('POST', '/api/me/bookings', { pg_id: 2, kind: 'inquiry', name: 'Test Student', phone: '9123456789', message: 'Is food veg?' }); assert.equal(r.s, 201);
    r = await own('POST', '/api/me/bookings', { pg_id: 2, kind: 'inquiry', name: 'x y', phone: '9123456789', message: 'abc' }); assert.equal(r.s, 403, 'owner cannot book');
  });
  await t('reviews: upsert recomputes rating, owner blocked, delete', async () => {
    let r = await stu('POST', '/api/pgs/5/reviews', { rating: 9, text: 'too high rating value' }); assert.equal(r.s, 400);
    r = await stu('POST', '/api/pgs/5/reviews', { rating: 1, text: 'Terrible stay honestly.' }); assert.equal(r.s, 201);
    r = await stu('POST', '/api/pgs/5/reviews', { rating: 2, text: 'Terrible stay, updated.' }); assert.equal(r.s, 201);
    let pg = (await anon('GET', '/api/pgs/5')).j; const mine = pg.reviews.filter((x) => x.name === 'Test Student'); assert.equal(mine.length, 1); assert.equal(mine[0].rating, 2);
    assert.equal((await own2('POST', '/api/pgs/5/reviews', { rating: 5, text: 'Reviewing my own PG!!' })).s, 403);
    assert.equal((await own('DELETE', '/api/reviews/' + mine[0].id)).s, 403);
    assert.equal((await stu('DELETE', '/api/reviews/' + mine[0].id)).s, 200);
  });
  await t('complaints: create, owner update, student sees response', async () => {
    let r = await stu('POST', '/api/me/complaints', { pg_id: 1, subject: 'Leaking tap', category: 'Maintenance', details: 'The tap in room 4 leaks.' }); assert.equal(r.s, 201); const id = r.j.id;
    assert.equal((await own2('PATCH', '/api/owner/complaints/' + id, { status: 'resolved' })).s, 404);
    assert.equal((await own('PATCH', '/api/owner/complaints/' + id, { status: 'progress', response: 'Plumber tomorrow' })).s, 200);
    r = await stu('GET', '/api/me/complaints'); const c = r.j.items.find((x) => x.id === id); assert.equal(c.status, 'progress'); assert.equal(c.response, 'Plumber tomorrow');
  });
  await t('owner PG CRUD + permissions + XSS stored raw (escaped on client)', async () => {
    const body = { name: 'Test <b>PG</b>', city: 'Pune', area: 'Baner', address: '1 Baner Road, Pune', gender: 'Co-ed', description: 'A very nice place for students to live.', facilities: ['wifi', 'bogus'], rooms: [{ type: 'Single', price: 9000, available: 2 }], deposit: 5000, rules: 'No smoking\nQuiet after 11' };
    let r = await own('POST', '/api/pgs', { ...body, rooms: [] }); assert.equal(r.s, 400);
    r = await own('POST', '/api/pgs', body); assert.equal(r.s, 201); const id = r.j.id; assert.deepEqual(r.j.facilities, ['wifi']); assert.equal(r.j.rent, 9000); assert.deepEqual(r.j.rules, ['No smoking', 'Quiet after 11']);
    assert.equal((await own2('PUT', '/api/pgs/' + id, body)).s, 403);
    r = await own('PUT', '/api/pgs/' + id, { ...body, rooms: [{ type: 'Double', price: 6500, available: 1 }] }); assert.equal(r.j.rent, 6500);
    await own('PATCH', `/api/pgs/${id}/active`, { active: false });
    assert.equal((await anon('GET', '/api/pgs/' + id)).s, 404, 'hidden PG not public');
    assert.equal((await own('GET', '/api/pgs/' + id)).s, 200, 'owner can still see');
    assert.equal((await own2('DELETE', '/api/pgs/' + id)).s, 403);
    assert.equal((await own('DELETE', '/api/pgs/' + id)).s, 200);
  });
  await t('profile + password + contact', async () => {
    let r = await stu('PATCH', '/api/auth/me', { name: 'Test Renamed', phone: '9000000000', city: 'Pune' }); assert.equal(r.j.user.name, 'Test Renamed');
    r = await stu('POST', '/api/auth/password', { current: 'nope', next: 'newpassword1' }); assert.equal(r.s, 400);
    r = await stu('POST', '/api/auth/password', { current: 'password1', next: 'newpassword1' }); assert.equal(r.s, 200);
    r = await anon('POST', '/api/auth/login', { email: 't@example.com', password: 'newpassword1' }); assert.equal(r.s, 200);
    r = await anon('POST', '/api/contact', { name: 'Zed', email: 'z@z.com', message: 'Hello, I need help please.' }); assert.equal(r.s, 201);
  });
  await t('bad input never 500s', async () => {
    for (const [m, u] of [['GET', '/api/pgs?page=abc&limit=-5&maxRent=x'], ['GET', '/api/pgs/abc'], ['GET', '/api/nothing']]) { const r = await anon(m, u); assert.ok(r.s < 500, `${u} -> ${r.s}`); }
    const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' }); assert.equal(r.status, 400);
  });

  console.log(`\n${passed} test groups passed`);
  server.close(); fs.rmSync(dir, { recursive: true, force: true });
  const { mongoose } = require('./db'); await mongoose.connection.dropDatabase(); await mongoose.disconnect();
});
}).catch((e) => { console.error('Cannot reach MongoDB:', e.message); process.exit(1); });
