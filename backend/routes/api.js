const express = require('express');
const router = express.Router();

// Sample GET route
router.get('/hello', (req, res) => {
  res.json({ message: 'Hello from Mantion Backend!' });
});

module.exports = router;