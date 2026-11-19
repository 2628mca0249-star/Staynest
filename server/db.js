
// MongoDB (Mongoose) connection + models

const path = require('path');
const fs = require('fs');

// Load .env file
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(path.join(__dirname, '..', '.env'));
  }
} catch (err) {
  if (err.code !== 'ENOENT') {
    console.error('Error loading .env:', err.message);
  }
}

const mongoose = require('mongoose');

const URI = (process.env.MONGODB_URI || '').trim();

mongoose.set('strictQuery', true);

// Database configuration
const hasDb = /^mongodb(?:\+srv)?:\/\/[^/?]+\/[^?\s]+/.test(URI);

const DB_OPTS = hasDb
  ? {}
  : { dbName: process.env.MONGODB_DB || 'staynest' };

const { Schema } = mongoose;

const now = () => new Date();

const mk = (name, def, indexes = []) => {
  const s = new Schema(def, { versionKey: false });

  indexes.forEach(([f, o]) => s.index(f, o));

  return mongoose.model(name, s);
};

const ID = {
  type: Number,
  required: true,
  unique: true
};

const REF = {
  type: Number,
  required: true
};

const TS = {
  type: Date,
  default: now
};

// Counter model
const Counter = mk('Counter', {
  _id: String,
  seq: { type: Number, default: 0 }
});

// Generate auto increment IDs
async function nextId(name) {
  const c = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return c.seq;
}

// User model
const User = mk('User', {
  id: ID,
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: String,
  password_hash: { type: String, required: true },
  role: {
    type: String,
    enum: ['student', 'owner'],
    default: 'student'
  },
  city: String,
  created_at: TS
});

// PG model
const Pg = mk('Pg', {
  id: ID,
  owner_id: REF,
  name: { type: String, required: true },
  city: { type: String, required: true },
  area: { type: String, required: true },
  address: { type: String, required: true },
  gender: {
    type: String,
    enum: ['Boys', 'Girls', 'Co-ed'],
    required: true
  },
  description: { type: String, default: '' },
  facilities: { type: [String], default: [] },
  image: String,
  gallery: { type: [String], default: [] },
  deposit: { type: Number, default: 0 },
  rules: { type: [String], default: [] },
  active: { type: Boolean, default: true },
  created_at: TS
}, [
  [{ city: 1 }],
  [{ owner_id: 1 }]
]);

// Room model
const Room = mk('Room', {
  pg_id: REF,
  type: {
    type: String,
    enum: ['Single', 'Double', 'Triple'],
    required: true
  },
  price: { type: Number, required: true, min: 1 },
  available: { type: Number, default: 0, min: 0 }
}, [
  [{ pg_id: 1, type: 1 }, { unique: true }]
]);

// Saved PG model
const Saved = mk('Saved', {
  user_id: REF,
  pg_id: REF,
  created_at: TS
}, [
  [{ user_id: 1, pg_id: 1 }, { unique: true }]
]);

// Booking model
const Booking = mk('Booking', {
  id: ID,
  user_id: REF,
  pg_id: REF,
  kind: {
    type: String,
    enum: ['booking', 'inquiry'],
    default: 'booking'
  },
  room_type: String,
  move_in: String,
  name: { type: String, required: true },
  phone: { type: String, required: true },
  message: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  owner_note: { type: String, default: '' },
  created_at: TS,
  updated_at: TS
}, [
  [{ user_id: 1 }],
  [{ pg_id: 1 }]
]);

// Review model
const Review = mk('Review', {
  id: ID,
  pg_id: REF,
  user_id: REF,
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  text: { type: String, required: true },
  created_at: TS
}, [
  [{ pg_id: 1, user_id: 1 }, { unique: true }]
]);

// Complaint model
const Complaint = mk('Complaint', {
  id: ID,
  user_id: REF,
  pg_id: REF,
  subject: { type: String, required: true },
  category: { type: String, required: true },
  details: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'progress', 'resolved'],
    default: 'open'
  },
  response: { type: String, default: '' },
  created_at: TS,
  updated_at: TS
}, [
  [{ user_id: 1 }],
  [{ pg_id: 1 }]
]);

// Contact model
const Contact = mk('Contact', {
  name: String,
  email: String,
  message: String,
  created_at: TS
});

// Format dates
const fmtDate = (d) =>
  d.toISOString().slice(0, 19).replace('T', ' ');

// Remove MongoDB internal _id
function clean(o) {
  if (!o) return o;

  const { _id, ...rest } = o;

  for (const k of Object.keys(rest)) {
    if (rest[k] instanceof Date) {
      rest[k] = fmtDate(rest[k]);
    }
  }

  return rest;
}

// MongoDB connection
let connecting;
let devServer;

function connect() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose);
  }

  if (!connecting) {
    connecting = (async () => {

      // Check MongoDB URI
      if (!URI) {
        throw new Error(
          'MONGODB_URI missing. Please check your .env file.'
        );
      }

      // Validate connection URL
      let parsed;

      try {
        parsed = new URL(URI);
      } catch {
        throw new Error(
          'Invalid MongoDB URI. Please check your .env file.'
        );
      }

      if (
        parsed.protocol !== 'mongodb+srv:' &&
        parsed.protocol !== 'mongodb:'
      ) {
        throw new Error('Invalid MongoDB connection protocol.');
      }

      if (!parsed.hostname) {
        throw new Error('MongoDB hostname is missing.');
      }

      console.log(
        'Connecting to MongoDB host:',
        parsed.hostname
      );

      try {
        // Connect to MongoDB Atlas or local MongoDB
        await mongoose.connect(URI, {
          ...DB_OPTS,
          serverSelectionTimeoutMS: 15000
        });

      } catch (err) {
        throw new Error(
          `MongoDB connection failed: ${err.message}`
        );
      }

      // Build indexes
      await Promise.all(
        Object.values(mongoose.models).map(
          (model) => model.init()
        )
      );

      const c = mongoose.connection;

      console.log(
        `MongoDB connected successfully! Database: ${c.name}`
      );

      return mongoose;

    })();

    connecting.catch(() => {
      connecting = null;
    });
  }

  return connecting;
}

// Disconnect
async function disconnect() {
  connecting = null;

  await mongoose.disconnect();

  if (devServer) {
    await devServer.stop();
    devServer = null;
  }
}

// Export models and functions
module.exports = {
  mongoose,
  connect,
  disconnect,
  nextId,
  clean,
  now,
  Counter,
  User,
  Pg,
  Room,
  Saved,
  Booking,
  Review,
  Complaint,
  Contact
};
