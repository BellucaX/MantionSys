const { rooms, getNextRoomId } = require('../data/store');

function listRooms(req, res) {
  const { status, type } = req.query;

  const filtered = rooms.filter((room) => {
    if (status && room.status !== status) return false;
    if (type && room.type !== type) return false;
    return true;
  });

  return res.json({ data: filtered });
}

function getRoomById(req, res) {
  const roomId = Number(req.params.roomId);
  const room = rooms.find((item) => item.id === roomId);

  if (!room) {
    return res.status(404).json({ error: 'Not Found', message: 'Room not found' });
  }

  return res.json({ data: room });
}

function createRoom(req, res) {
  const { roomNumber, type, pricePerNight, maxGuests } = req.body;

  if (!roomNumber || !type || !pricePerNight || !maxGuests) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'roomNumber, type, pricePerNight, maxGuests are required',
    });
  }

  const duplicate = rooms.find((room) => room.roomNumber === String(roomNumber));
  if (duplicate) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'roomNumber already exists',
    });
  }

  const newRoom = {
    id: getNextRoomId(),
    roomNumber: String(roomNumber),
    type: String(type),
    pricePerNight: Number(pricePerNight),
    status: 'available',
    maxGuests: Number(maxGuests),
  };

  rooms.push(newRoom);
  return res.status(201).json({ data: newRoom });
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

  const room = rooms.find((item) => item.id === roomId);
  if (!room) {
    return res.status(404).json({ error: 'Not Found', message: 'Room not found' });
  }

  room.status = status;
  return res.json({ data: room });
}

module.exports = {
  listRooms,
  getRoomById,
  createRoom,
  updateRoomStatus,
};