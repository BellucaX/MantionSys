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

module.exports = {
  signAuthToken,
};
