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

  const result = rooms.map(room => ({
    ...room,
    price: room.pricePerNight,
    floor: Math.floor(parseInt(room.roomNumber) / 100),
    name: `ห้อง ${room.roomNumber}`
  }));

  return res.json(result); 
}

function getRoomById(req, res) {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(Number(req.params.roomId));
  if (!room) {
    return res.status(404).json({ error: 'Not Found', message: 'Room not found' });
  }
  return res.json({
    ...room,
    price: room.pricePerNight,
    floor: Math.floor(parseInt(room.roomNumber) / 100),
    name: `ห้อง ${room.roomNumber}`
  });
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
  return res.status(201).json({
    ...newRoom,
    price: newRoom.pricePerNight,
    floor: Math.floor(parseInt(newRoom.roomNumber) / 100),
    name: `ห้อง ${newRoom.roomNumber}`
  });
}

function updateRoomStatus(req, res) {
  const roomId = Number(req.params.roomId);
  const { status } = req.body;

  const allowedStatus = ['available', 'occupied', 'maintenance'];
  if (!allowedStatus.includes(status)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `status must be one of: ${allowedStatus.join(', ')}`,
    });
  }

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Not Found', message: 'Room not found' });
  }

  db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(status, roomId);
  const updated = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  
  return res.json({
    ...updated,
    price: updated.pricePerNight,
    floor: Math.floor(parseInt(updated.roomNumber) / 100),
    name: `ห้อง ${updated.roomNumber}`
  });
}

module.exports = { listRooms, getRoomById, createRoom, updateRoomStatus };