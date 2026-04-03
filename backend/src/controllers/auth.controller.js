const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db/connection');
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
  const { name, email, password } = req.body;

  const normalizedEmail = email.trim().toLowerCase();
  const duplicate = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(normalizedEmail);
  if (duplicate) {
    return res.status(409).json({ error: 'Conflict', message: 'email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();

  const result = db
    .prepare(
      'INSERT INTO users (name, email, provider, passwordHash, createdAt) VALUES (?, ?, ?, ?, ?)'
    )
    .run(name.trim(), normalizedEmail, 'local', passwordHash, createdAt);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = signAuthToken(user);

  return res.status(201).json({ data: { user: sanitizeUser(user), token } });
}

async function login(req, res) {
  const { email, password } = req.body;

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
  }

  const token = signAuthToken(user);
  return res.json({ data: { user: sanitizeUser(user), token } });
}

async function googleQuickLogin(req, res) {
  const { idToken } = req.body;

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
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid Google token payload' });
  }

  const normalizedEmail = payload.email.toLowerCase();
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

  if (!user) {
    const createdAt = new Date().toISOString();
    const result = db
      .prepare(
        'INSERT INTO users (name, email, provider, passwordHash, createdAt) VALUES (?, ?, ?, ?, ?)'
      )
      .run(payload.name || normalizedEmail.split('@')[0], normalizedEmail, 'google', null, createdAt);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  }

  const token = signAuthToken(user);
  return res.json({ data: { user: sanitizeUser(user), token } });
}

function me(req, res) {
  return res.json({ data: req.user });
}

module.exports = { register, login, googleQuickLogin, me };
