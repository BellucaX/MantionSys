const express = require('express');
const {
  register,
  login,
  googleQuickLogin,
  me,
} = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleQuickLogin);
router.get('/me', requireAuth, me);

module.exports = router;
