const db = require('./connection');

const INITIAL_ROOMS = [
  { roomNumber: '101', type: 'standard', pricePerNight: 900,  status: 'available', maxGuests: 2 },
  { roomNumber: '102', type: 'deluxe',   pricePerNight: 1400, status: 'available', maxGuests: 2 },
  { roomNumber: '201', type: 'family',   pricePerNight: 2200, status: 'available', maxGuests: 4 },
];

function seed() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM rooms').get();
  if (count.cnt > 0) {
    console.log('[DB] Seed skipped — rooms already exist');
    return;
  }

  const insert = db.prepare(
    'INSERT INTO rooms (roomNumber, type, pricePerNight, status, maxGuests) VALUES (?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insert.run(row.roomNumber, row.type, row.pricePerNight, row.status, row.maxGuests);
    }
  });

  insertMany(INITIAL_ROOMS);
  console.log(`[DB] Seeded ${INITIAL_ROOMS.length} rooms`);
}

module.exports = { seed };
