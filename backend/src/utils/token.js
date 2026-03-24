const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function signAdminToken() {
  return jwt.sign(
    {
      sub: 'admin',
      role: 'admin',
      name: 'Administrator',
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

module.exports = {
  signAuthToken,
  signAdminToken,
};
