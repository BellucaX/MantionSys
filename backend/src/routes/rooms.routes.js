const express = require('express');
const {
  listRooms,
  getRoomById,
  createRoom,
  updateRoomStatus,
} = require('../controllers/rooms.controller');

const router = express.Router();

router.get('/', listRooms);
router.get('/:roomId', getRoomById);
router.post('/', createRoom);
router.patch('/:roomId/status', updateRoomStatus);

module.exports = router;