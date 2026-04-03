process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_PASSCODE = 'testpass';

const request = require('supertest');
const app = require('../src/app');
const { migrate } = require('../src/db/migrate');
const { seed } = require('../src/db/seeds');
const { resetDb } = require('../src/db/connection');

beforeAll(() => {
  resetDb();
  migrate();
  seed();
});

afterAll(() => {
  resetDb();
});

describe('Auth API', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  };

  let authToken;

  test('POST /api/auth/register → registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(testUser.email);
    authToken = res.body.data.token;
  });

  test('POST /api/auth/register → 409 on duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(409);
  });

  test('POST /api/auth/register → 422 on invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'X',
      email: 'not-an-email',
      password: 'password123',
    });
    expect(res.status).toBe(422);
  });

  test('POST /api/auth/register → 422 on short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'X',
      email: 'x@example.com',
      password: '123',
    });
    expect(res.status).toBe(422);
  });

  test('POST /api/auth/login → returns token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    authToken = res.body.data.token;
  });

  test('POST /api/auth/login → 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me → returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testUser.email);
  });

  test('GET /api/auth/me → 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
