CREATE TABLE IF NOT EXISTS rooms (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  roomNumber    TEXT    NOT NULL UNIQUE,
  type          TEXT    NOT NULL,
  pricePerNight REAL    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'available',
  maxGuests     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  email        TEXT    NOT NULL UNIQUE,
  provider     TEXT    NOT NULL DEFAULT 'local',
  passwordHash TEXT,
  createdAt    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  roomId          INTEGER NOT NULL REFERENCES rooms(id),
  guestName       TEXT    NOT NULL,
  guestPhone      TEXT,
  checkInDate     TEXT    NOT NULL,
  checkOutDate    TEXT    NOT NULL,
  guestCount      INTEGER NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'reserved',
  paymentStatus   TEXT,
  paymentIntentId TEXT,
  holdToken       TEXT,
  checkedInAt     TEXT,
  checkedOutAt    TEXT,
  cancelledAt     TEXT,
  createdAt       TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS room_holds (
  holdToken    TEXT PRIMARY KEY,
  roomId       INTEGER NOT NULL REFERENCES rooms(id),
  checkInDate  TEXT    NOT NULL,
  checkOutDate TEXT    NOT NULL,
  guestCount   INTEGER NOT NULL,
  expiresAt    TEXT    NOT NULL,
  createdAt    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_intents (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  paymentIntentId TEXT    NOT NULL UNIQUE,
  holdToken       TEXT    NOT NULL,
  amount          REAL    NOT NULL DEFAULT 0,
  status          TEXT    NOT NULL DEFAULT 'requires_confirmation',
  paidAt          TEXT,
  createdAt       TEXT    NOT NULL
);
