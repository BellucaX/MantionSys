process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_PASSCODE = 'testpass';

const request = require('supertest');
const app = require('../src/app');
const { migrate } = require('../src/db/migrate');
const { seed } = require('../src/db/seeds');
const { resetDb } = require('../src/db/connection');

beforeAll(() => {
  resetDb(); // ensure fresh :memory: DB
  migrate();
  seed();
});

afterAll(() => {
  resetDb();
});

describe('Rooms API', () => {
  test('GET /api/rooms → returns seeded rooms', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  test('GET /api/rooms?type=standard → filters correctly', async () => {
    const res = await request(app).get('/api/rooms?type=standard');
    expect(res.status).toBe(200);
    res.body.data.forEach((room) => expect(room.type).toBe('standard'));
  });

  test('GET /api/rooms/:id → returns a room', async () => {
    const res = await request(app).get('/api/rooms/1');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('id', 1);
  });

  test('GET /api/rooms/:id → 404 when not found', async () => {
    const res = await request(app).get('/api/rooms/9999');
    expect(res.status).toBe(404);
  });

  test('POST /api/rooms → creates a room', async () => {
    const res = await request(app).post('/api/rooms').send({
      roomNumber: '999',
      type: 'suite',
      pricePerNight: 5000,
      maxGuests: 2,
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('roomNumber', '999');
  });

  test('POST /api/rooms → 409 on duplicate roomNumber', async () => {
    await request(app).post('/api/rooms').send({
      roomNumber: 'DUP-01',
      type: 'standard',
      pricePerNight: 900,
      maxGuests: 2,
    });
    const res = await request(app).post('/api/rooms').send({
      roomNumber: 'DUP-01',
      type: 'standard',
      pricePerNight: 900,
      maxGuests: 2,
    });
    expect(res.status).toBe(409);
  });

  test('POST /api/rooms → 422 on invalid type enum', async () => {
    const res = await request(app).post('/api/rooms').send({
      roomNumber: 'Z99',
      type: 'penthouse',
      pricePerNight: 5000,
      maxGuests: 2,
    });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeInstanceOf(Array);
  });

  test('PATCH /api/rooms/:id/status → updates status', async () => {
    const res = await request(app).patch('/api/rooms/1/status').send({ status: 'maintenance' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('maintenance');
    // Reset for other tests
    await request(app).patch('/api/rooms/1/status').send({ status: 'available' });
  });

  test('PATCH /api/rooms/:id/status → 422 on invalid status', async () => {
    const res = await request(app).patch('/api/rooms/1/status').send({ status: 'dirty' });
    expect(res.status).toBe(422);
  });
});
