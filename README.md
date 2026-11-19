# StayNest — PG & Hostel Finder (full-stack)

Node.js + Express + MongoDB (Mongoose) backend, vanilla-JS frontend (no build step).

## Run
MongoDB options (pick one):
1. **Nothing to install (dev):** just `npm start` — if no MongoDB is found on localhost, a local dev MongoDB is started automatically (first run downloads it; data in `data/mongo`).
2. **Docker:** `docker compose up -d`
3. **Installed MongoDB** (`mongod`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster → set `MONGODB_URI`.
```bash
npm install
export MONGODB_URI="mongodb://127.0.0.1:27017/staynest"   # or your Atlas mongodb+srv:// URI
npm start          # http://localhost:3000
npm test           # end-to-end API tests (throwaway database, dropped afterwards)
npm run seed       # wipe + reseed demo data
```
Collections and indexes are created automatically; demo data is seeded on first start (dev) — in production set `SEED=1` once.

## Demo accounts
| Role | Email | Password |
|---|---|---|
| Student | demo@staynest.in | demo1234 |
| Owner | owner@staynest.in | owner1234 |

## Features
- **Auth**: signup/login/logout, bcrypt hashing, JWT in httpOnly cookie, rate-limited, roles (student / owner), profile edit, change password
- **Search**: keyword, city, max rent, room type, gender, facilities, vacancy filter, sorting, pagination, shareable URLs
- **PG details**: gallery, facilities, room-wise rent & availability, deposit, house rules, rating breakdown, similar PGs
- **Students**: save favourites, booking requests & owner enquiries (with validation), cancel, reviews (one per PG, editable), complaints with status tracking
- **Owners**: add/edit/hide/delete listings, manage rooms & vacancies, approve/decline requests (auto-updates beds), respond to complaints
- **Help centre** with FAQ + contact form stored in DB; 404 page; responsive UI; accessible forms/modals; CSP + helmet

## Structure
```
server/  index.js, db.js (Mongoose models), seed.js, util.js, images.js, routes/, test.js
public/  *.html, css/app.css, js/*.js
```
Env vars: `MONGODB_URI` (default `mongodb://127.0.0.1:27017/staynest`), `PORT`, `JWT_SECRET`, `NODE_ENV=production` (set `SEED=1` to seed on first prod start), `MONGODB_URI_TEST` (server used by `npm test`).

### MongoDB notes
Collections: `users`, `pgs`, `rooms`, `saved`, `bookings`, `reviews`, `complaints`, `contacts`, plus `counters`. Documents keep a small numeric `id` (allocated from `counters`), so API URLs like `/api/pgs/3` are unchanged. Unique indexes enforce one email per user, one review per user per PG, one room type per PG. Room availability is changed with atomic `$inc` updates, so no replica set / transactions are required.
