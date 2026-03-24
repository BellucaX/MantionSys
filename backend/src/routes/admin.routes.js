const express = require('express');
const { adminLogin, getAdminDashboard } = require('../controllers/admin.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', adminLogin);
router.get('/dashboard', requireAdmin, getAdminDashboard);

module.exports = router;
