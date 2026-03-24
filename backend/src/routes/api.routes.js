const express = require('express');
const router = express.Router();
const { getHello } = require('../controllers/api.controller');
const { getApiHealth } = require('../controllers/health.controller');
const roomRoutes = require('./rooms.routes');
const bookingRoutes = require('./bookings.routes');
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');

router.get('/hello', getHello);
router.get('/health', getApiHealth);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/rooms', roomRoutes);
router.use('/bookings', bookingRoutes);

module.exports = router;