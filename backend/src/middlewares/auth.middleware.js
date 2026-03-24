const jwt = require('jsonwebtoken');
const { users } = require('../data/store');
const { JWT_SECRET } = require('../config/env');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing bearer token',
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.find((item) => item.id === Number(payload.sub));

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token user',
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

module.exports = {
  requireAuth,
};
