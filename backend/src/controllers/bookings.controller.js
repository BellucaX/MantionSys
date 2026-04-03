const crypto = require('crypto');
const generatePayload = require('promptpay-qr');
const qrcode = require('qrcode');
const { PROMPTPAY_ID } = require('../config/env');
const db = require('../db/connection');

const HOLD_MINUTES = 10;

// ── helpers ──────────────────────────────────────────────────────────────────

function isDateRangeValid(checkInDate, checkOutDate) {
  const ci = new Date(checkInDate).getTime();
  const co = new Date(checkOutDate).getTime();
  return Number.isFinite(ci) && Number.isFinite(co) && ci < co;
}

function purgeExpiredHolds() {
  db.prepare('DELETE FROM room_holds WHERE expiresAt <= ?').run(new Date().toISOString());
}

/**
 * Returns true if the room has an active booking overlapping the given range.
 * Excludes cancelled and checked_out bookings.
 */
function isRoomBookedInRange(roomId, checkInDate, checkOutDate) {
  const row = db
    .prepare(
      `SELECT id FROM bookings
       WHERE roomId = ?
         AND status NOT IN ('cancelled', 'checked_out')
         AND checkInDate  < ?
         AND checkOutDate > ?
       LIMIT 1`
    )
    .get(roomId, checkOutDate, checkInDate);
  return !!row;
}

/**
 * Returns true if the room has a non-expired hold overlapping the given range.
 */
function isRoomHeldInRange(roomId, checkInDate, checkOutDate) {
  purgeExpiredHolds();
  const row = db
    .prepare(
      `SELECT holdToken FROM room_holds
       WHERE roomId = ?
         AND checkInDate  < ?
         AND checkOutDate > ?
       LIMIT 1`
    )
    .get(roomId, checkOutDate, checkInDate);
  return !!row;
}

// ── controllers ───────────────────────────────────────────────────────────────

function listBookings(req, res) {
  const bookings = db.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
  return res.json({ data: bookings });
}

function getBookingById(req, res) {
  const booking = db
    .prepare('SELECT * FROM bookings WHERE id = ?')
    .get(Number(req.params.bookingId));
  if (!booking) {
    return res.status(404).json({ error: 'Not Found', message: 'Booking not found' });
  }
  return res.json({ data: booking });
}

function createBooking(req, res) {
  const { roomId, guestName, guestPhone, checkInDate, checkOutDate, guestCount } = req.body;

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(Number(roomId));
  if (!room) {
    return res.status(404).json({ error: 'Not Found', message: 'Room not found' });
  }

  if (room.status === 'maintenance') {
    return res.status(409).json({ error: 'Conflict', message: 'Room is under maintenance' });
  }

  if (Number(guestCount) > room.maxGuests) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `guestCount exceeds maxGuests (${room.maxGuests})`,
    });
  }

  if (!isDateRangeValid(checkInDate, checkOutDate)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'checkInDate must be before checkOutDate',
    });
  }

  if (
    isRoomBookedInRange(room.id, checkInDate, checkOutDate) ||
    isRoomHeldInRange(room.id, checkInDate, checkOutDate)
  ) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Room is already booked in this date range',
    });
  }

  const createdAt = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO bookings
         (roomId, guestName, guestPhone, checkInDate, checkOutDate, guestCount, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'reserved', ?)`
    )
    .run(room.id, guestName, guestPhone || null, checkInDate, checkOutDate, guestCount, createdAt);

  const newBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json({ data: newBooking });
}

function precheckAndHold(req, res) {
  const { roomId, checkInDate, checkOutDate, guestCount } = req.body;

  if (!isDateRangeValid(checkInDate, checkOutDate)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'checkInDate must be before checkOutDate',
    });
  }

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(Number(roomId));
  if (!room) {
    return res.status(404).json({ error: 'Not Found', message: 'Room not found' });
  }

  if (room.status === 'maintenance') {
    return res.status(409).json({ error: 'Conflict', message: 'Room is under maintenance' });
  }

  if (Number(guestCount) > room.maxGuests) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `guestCount exceeds maxGuests (${room.maxGuests})`,
    });
  }

  if (
    isRoomBookedInRange(room.id, checkInDate, checkOutDate) ||
    isRoomHeldInRange(room.id, checkInDate, checkOutDate)
  ) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Room is no longer available for selected dates',
    });
  }

  const holdToken = `hold_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO room_holds (holdToken, roomId, checkInDate, checkOutDate, guestCount, expiresAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(holdToken, room.id, checkInDate, checkOutDate, guestCount, expiresAt, createdAt);

  return res.json({
    data: { available: true, holdToken, holdExpiresAt: expiresAt, holdMinutes: HOLD_MINUTES },
  });
}

async function createPaymentIntent(req, res) {
  purgeExpiredHolds();
  const { holdToken, amount } = req.body;

  const hold = db.prepare('SELECT * FROM room_holds WHERE holdToken = ?').get(holdToken);
  if (!hold) {
    return res.status(409).json({ error: 'Conflict', message: 'Hold token is invalid or expired' });
  }

  const paymentIntentId = `pi_${crypto.randomUUID().slice(0, 12)}`;
  const createdAt = new Date().toISOString();
  const numericalAmount = Number(amount) || 0;

  db.prepare(
    `INSERT INTO payment_intents (paymentIntentId, holdToken, amount, status, createdAt)
     VALUES (?, ?, ?, 'requires_confirmation', ?)`
  ).run(paymentIntentId, holdToken, numericalAmount, createdAt);

  try {
    const payload = generatePayload(PROMPTPAY_ID, { amount: numericalAmount });
    const qrCodeImage = await qrcode.toDataURL(payload, { type: 'image/png', color: { dark: '#000000', light: '#ffffff' } });
    
    return res.json({ 
      data: { 
        paymentIntentId, 
        amount: numericalAmount,
        status: 'requires_confirmation',
        qrCodeImage 
      } 
    });
  } catch (error) {
    console.error('Failed to generate PromptPay QR:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to generate QR code' });
  }
}

function confirmBookingAfterPayment(req, res) {
  purgeExpiredHolds();
  const { holdToken, paymentIntentId, guestName, guestPhone } = req.body;

  const hold = db.prepare('SELECT * FROM room_holds WHERE holdToken = ?').get(holdToken);
  if (!hold) {
    return res.status(409).json({ error: 'Conflict', message: 'Hold token is invalid or expired' });
  }

  const intent = db
    .prepare(
      'SELECT * FROM payment_intents WHERE paymentIntentId = ? AND holdToken = ?'
    )
    .get(paymentIntentId, holdToken);
  if (!intent) {
    return res.status(409).json({ error: 'Conflict', message: 'Payment intent is invalid' });
  }

  // Idempotency: already confirmed
  if (intent.status === 'succeeded') {
    const existed = db
      .prepare('SELECT * FROM bookings WHERE paymentIntentId = ?')
      .get(paymentIntentId);
    if (existed) return res.json({ data: existed, message: 'Booking already confirmed' });
  }

  if (isRoomBookedInRange(hold.roomId, hold.checkInDate, hold.checkOutDate)) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Room was booked by another transaction',
    });
  }

  const now = new Date().toISOString();

  const confirmTx = db.transaction(() => {
    db.prepare(
      'UPDATE payment_intents SET status = ?, paidAt = ? WHERE paymentIntentId = ?'
    ).run('succeeded', now, paymentIntentId);

    const result = db
      .prepare(
        `INSERT INTO bookings
           (roomId, guestName, guestPhone, checkInDate, checkOutDate, guestCount,
            status, paymentStatus, paymentIntentId, holdToken, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, 'reserved', 'paid', ?, ?, ?)`
      )
      .run(
        hold.roomId, guestName, guestPhone || null,
        hold.checkInDate, hold.checkOutDate, hold.guestCount,
        paymentIntentId, holdToken, now
      );

    db.prepare('DELETE FROM room_holds WHERE holdToken = ?').run(holdToken);
    return result.lastInsertRowid;
  });

  const newId = confirmTx();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(newId);
  return res.status(201).json({ data: booking });
}

function releaseHold(req, res) {
  const { holdToken } = req.body;

  const hold = db.prepare('SELECT holdToken FROM room_holds WHERE holdToken = ?').get(holdToken);
  if (!hold) {
    return res.status(404).json({ error: 'Not Found', message: 'Hold token not found' });
  }

  db.prepare('DELETE FROM room_holds WHERE holdToken = ?').run(holdToken);
  return res.json({ data: { released: true } });
}

function checkInBooking(req, res) {
  const bookingId = Number(req.params.bookingId);
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Not Found', message: 'Booking not found' });
  }
  if (booking.status !== 'reserved') {
    return res.status(409).json({ error: 'Conflict', message: 'Only reserved booking can check in' });
  }

  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare('UPDATE bookings SET status = ?, checkedInAt = ? WHERE id = ?')
      .run('checked_in', now, bookingId);
    db.prepare('UPDATE rooms SET status = ? WHERE id = ?')
      .run('occupied', booking.roomId);
  })();

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  return res.json({ data: updated });
}

function checkOutBooking(req, res) {
  const bookingId = Number(req.params.bookingId);
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Not Found', message: 'Booking not found' });
  }
  if (booking.status !== 'checked_in') {
    return res.status(409).json({ error: 'Conflict', message: 'Only checked-in booking can check out' });
  }

  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare('UPDATE bookings SET status = ?, checkedOutAt = ? WHERE id = ?')
      .run('checked_out', now, bookingId);
    db.prepare('UPDATE rooms SET status = ? WHERE id = ?')
      .run('available', booking.roomId);
  })();

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  return res.json({ data: updated });
}

function cancelBooking(req, res) {
  const bookingId = Number(req.params.bookingId);
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Not Found', message: 'Booking not found' });
  }
  if (booking.status === 'checked_out') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Cannot cancel an already checked-out booking',
    });
  }

  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare('UPDATE bookings SET status = ?, cancelledAt = ? WHERE id = ?')
      .run('cancelled', now, bookingId);
    if (booking.status === 'checked_in') {
      db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run('available', booking.roomId);
    }
  })();

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  return res.json({ data: updated });
}

module.exports = {
  listBookings,
  getBookingById,
  createBooking,
  precheckAndHold,
  createPaymentIntent,
  confirmBookingAfterPayment,
  releaseHold,
  checkInBooking,
  checkOutBooking,
  cancelBooking,
};