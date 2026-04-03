const express = require('express');
const { listRooms, getRoomById, createRoom, updateRoomStatus } = require('../controllers/rooms.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createRoomSchema, updateRoomStatusSchema } = require('../validators/room.validator');

const router = express.Router();

router.get('/', listRooms);
router.get('/:roomId', getRoomById);
router.post('/', validate(createRoomSchema), createRoom);
router.patch('/:roomId/status', validate(updateRoomStatusSchema), updateRoomStatus);

module.exports = router;