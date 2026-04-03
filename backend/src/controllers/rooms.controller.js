const db = require('../db/connection');

function listRooms(req, res) {
  const { status, type } = req.query;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rooms = db.prepare(`SELECT * FROM rooms ${where}`).all(...params);
  return res.json({ data: rooms });
}

function getRoomById(req, res) {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(Number(req.params.roomId));
  if (!room) {
    return res.status(404).json({ error: 'Not Found', message: 'Room not found' });
  }
  return res.json({ data: room });
}

function createRoom(req, res) {
  const { roomNumber, type, pricePerNight, maxGuests } = req.body;

  const duplicate = db.prepare('SELECT id FROM rooms WHERE roomNumber = ?').get(roomNumber);
  if (duplicate) {
    return res.status(409).json({ error: 'Conflict', message: 'roomNumber already exists' });
  }

  const result = db
    .prepare(
      'INSERT INTO rooms (roomNumber, type, pricePerNight, status, maxGuests) VALUES (?, ?, ?, ?, ?)'
    )
    .run(roomNumber, type, pricePerNight, 'available', maxGuests);

  const newRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json({ data: newRoom });
}

function updateRoomStatus(req, res) {
  const roomId = Number(req.params.roomId);
  const { status } = req.body;

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Not Found', message: 'Room not found' });
  }

  db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(status, roomId);
  const updated = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  return res.json({ data: updated });
}

module.exports = { listRooms, getRoomById, createRoom, updateRoomStatus };