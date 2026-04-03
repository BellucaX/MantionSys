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

describe('Bookings API', () => {
  test('GET /api/bookings → returns empty array initially', async () => {
    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(0);
  });

  test('POST /api/bookings → creates a booking on room 1', async () => {
    const res = await request(app).post('/api/bookings').send({
      roomId: 1,
      guestName: 'Somchai',
      guestPhone: '0812345678',
      checkInDate: '2030-06-01',
      checkOutDate: '2030-06-03',
      guestCount: 2,
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.guestName).toBe('Somchai');
    expect(res.body.data.status).toBe('reserved');
  });

  test('POST /api/bookings → 409 on date overlap same room', async () => {
    const res = await request(app).post('/api/bookings').send({
      roomId: 1,
      guestName: 'Another Guest',
      checkInDate: '2030-06-01',
      checkOutDate: '2030-06-03',
      guestCount: 1,
    });
    expect(res.status).toBe(409);
  });

  test('POST /api/bookings → 422 on missing fields', async () => {
    const res = await request(app).post('/api/bookings').send({ roomId: 1 });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeInstanceOf(Array);
  });

  test('POST /api/bookings/precheck → returns holdToken for room 2', async () => {
    const res = await request(app).post('/api/bookings/precheck').send({
      roomId: 2,
      checkInDate: '2030-07-01',
      checkOutDate: '2030-07-03',
      guestCount: 1,
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('holdToken');
    expect(res.body.data.available).toBe(true);
  });

  test('Full booking flow: precheck → payment-intent → confirm (room 3)', async () => {
    const precheckRes = await request(app).post('/api/bookings/precheck').send({
      roomId: 3,
      checkInDate: '2030-08-10',
      checkOutDate: '2030-08-15',
      guestCount: 2,
    });
    expect(precheckRes.status).toBe(200);
    const { holdToken } = precheckRes.body.data;

    const piRes = await request(app).post('/api/bookings/payment-intent').send({
      holdToken,
      amount: 2200 * 5,
    });
    expect(piRes.status).toBe(200);
    const { paymentIntentId } = piRes.body.data;

    const confirmRes = await request(app).post('/api/bookings/confirm').send({
      holdToken,
      paymentIntentId,
      guestName: 'Somying',
      guestPhone: '0899999999',
    });
    expect(confirmRes.status).toBe(201);
    expect(confirmRes.body.data.status).toBe('reserved');
    expect(confirmRes.body.data.paymentStatus).toBe('paid');
  });

  describe('Check-in / Check-out / Cancel flow (room 2)', () => {
    let bookingId;

    beforeAll(async () => {
      const res = await request(app).post('/api/bookings').send({
        roomId: 2,
        guestName: 'Flow Test',
        checkInDate: '2030-09-01',
        checkOutDate: '2030-09-03',
        guestCount: 1,
      });
      bookingId = res.body.data.id;
    });

    test('PATCH /check-in → 200', async () => {
      const res = await request(app).patch(`/api/bookings/${bookingId}/check-in`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('checked_in');
    });

    test('PATCH /check-out → 200', async () => {
      const res = await request(app).patch(`/api/bookings/${bookingId}/check-out`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('checked_out');
    });

    test('PATCH /cancel → 409 on already checked-out booking', async () => {
      const res = await request(app).patch(`/api/bookings/${bookingId}/cancel`);
      expect(res.status).toBe(409);
    });
  });
});
