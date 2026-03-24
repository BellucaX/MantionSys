const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { users, getNextUserId } = require('../data/store');
const { GOOGLE_CLIENT_ID } = require('../config/env');
const { signAuthToken } = require('../utils/token');

const googleClient = new OAuth2Client();

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    createdAt: user.createdAt,
  };
}

async function register(req, res) {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'name, email, password are required',
    });
  }

  if (String(password).length < 6) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'password must be at least 6 characters',
    });
  }

  if (confirmPassword !== undefined && String(password) !== String(confirmPassword)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'password and confirmPassword must match',
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const duplicate = users.find((user) => user.email === normalizedEmail);
  if (duplicate) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'email already registered',
    });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = {
    id: getNextUserId(),
    name: String(name).trim(),
    email: normalizedEmail,
    provider: 'local',
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(user);

  const token = signAuthToken(user);
  return res.status(201).json({
    data: {
      user: sanitizeUser(user),
      token,
    },
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'email and password are required',
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = users.find((item) => item.email === normalizedEmail);

  if (!user || !user.passwordHash) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid email or password',
    });
  }

  const isMatch = await bcrypt.compare(String(password), user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid email or password',
    });
  }

  const token = signAuthToken(user);
  return res.json({
    data: {
      user: sanitizeUser(user),
      token,
    },
  });
}

async function googleQuickLogin(req, res) {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'idToken is required',
    });
  }

  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({
      error: 'Server Misconfigured',
      message: 'GOOGLE_CLIENT_ID is not configured',
    });
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Google token payload',
    });
  }

  const normalizedEmail = String(payload.email).toLowerCase();
  let user = users.find((item) => item.email === normalizedEmail);

  if (!user) {
    user = {
      id: getNextUserId(),
      name: payload.name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      provider: 'google',
      passwordHash: null,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
  }

  const token = signAuthToken(user);
  return res.json({
    data: {
      user: sanitizeUser(user),
      token,
    },
  });
}

function me(req, res) {
  return res.json({ data: req.user });
}

module.exports = {
  register,
  login,
  googleQuickLogin,
  me,
};
