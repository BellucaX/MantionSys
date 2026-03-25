const { rooms, getNextRoomId } = require('../data/store');

function listRooms(req, res) {
  const { status, type } = req.query;

  const filtered = rooms.filter((room) => {
    if (status && room.status !== status) return false;
    if (type && room.type !== type) return false;
    return true;
  });

  // แก้ตรงนี้: ส่ง filtered ออกไปตรงๆ ไม่ต้องมี { data: ... }
  // และ map ข้อมูลให้มี field ที่ script.js ต้องการ
  const result = filtered.map(room => ({
    ...room,
    price: room.price || room.pricePerNight, // รองรับทั้งสองชื่อ
    floor: room.floor || Math.floor(parseInt(room.roomNumber) / 100), // คำนวณชั้นจากเลขห้องถ้าไม่มี
    name: room.name || `ห้อง ${room.roomNumber}` // สร้างชื่อห้องถ้าไม่มี
  }));

  return res.json(result); 
}

function getRoomById(req, res) {
  const roomId = Number(req.params.roomId);
  const room = rooms.find((item) => item.id === roomId);

  if (!room) {
    return res.status(404).json({ error: 'Not Found', message: 'Room not found' });
  }

  // แก้ตรงนี้: ส่ง room ออกไปตรงๆ
  return res.json({
    ...room,
    price: room.price || room.pricePerNight,
    floor: room.floor || Math.floor(parseInt(room.roomNumber) / 100)
  });
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
  // สำหรับ Create ส่ง Object กลับไปได้เลย
  return res.status(201).json(newRoom);
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

  const roomIndex = rooms.findIndex((item) => item.id === roomId);
  if (roomIndex === -1) {
    return res.status(404).json({ error: 'Not Found', message: 'Room not found' });
  }

  rooms[roomIndex].status = status;
  return res.json(rooms[roomIndex]);
}

module.exports = {
  listRooms,
  getRoomById,
  createRoom,
  updateRoomStatus,
};