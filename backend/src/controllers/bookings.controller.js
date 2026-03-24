const crypto = require('crypto');
const {
  rooms,
  bookings,
  roomHolds,
  paymentIntents,
  getNextBookingId,
  getNextPaymentIntentId,
  purgeExpiredHolds,
} = require('../data/store');

const HOLD_MINUTES = 10;

function isDateRangeValid(checkInDate, checkOutDate) {
  const checkIn = new Date(checkInDate).getTime();
  const checkOut = new Date(checkOutDate).getTime();
  return Number.isFinite(checkIn) && Number.isFinite(checkOut) && checkIn < checkOut;
}

function hasOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function isRoomBookedInRange(roomId, checkInDate, checkOutDate) {
  const incomingStart = new Date(checkInDate).getTime();
  const incomingEnd = new Date(checkOutDate).getTime();

  return bookings.some((booking) => {
    if (booking.roomId !== roomId) return false;
    if (booking.status === 'cancelled' || booking.status === 'checked_out') return false;

    const existingStart = new Date(booking.checkInDate).getTime();
    const existingEnd = new Date(booking.checkOutDate).getTime();
    return hasOverlap(incomingStart, incomingEnd, existingStart, existingEnd);
  });
}

function isRoomHeldInRange(roomId, checkInDate, checkOutDate) {
  purgeExpiredHolds();
  const incomingStart = new Date(checkInDate).getTime();
  const incomingEnd = new Date(checkOutDate).getTime();

  return roomHolds.some((hold) => {
    if (hold.roomId !== roomId) return false;
    const holdStart = new Date(hold.checkInDate).getTime();
    const holdEnd = new Date(hold.checkOutDate).getTime();
    return hasOverlap(incomingStart, incomingEnd, holdStart, holdEnd);
  });
}

function findRoomOr404(roomId, res) {
  const room = rooms.find((item) => item.id === Number(roomId));
  if (!room) {
    res.status(404).json({ error: 'Not Found', message: 'Room not found' });
    return null;
  }
  return room;
}

function listBookings(req, res) {
  return res.json({ data: bookings });
}

function getBookingById(req, res) {
  const bookingId = Number(req.params.bookingId);
  const booking = bookings.find((item) => item.id === bookingId);

  if (!booking) {
    return res.status(404).json({ error: 'Not Found', message: 'Booking not found' });
  }

  return res.json({ data: booking });
}

function createBooking(req, res) {
  const { roomId, guestName, guestPhone, checkInDate, checkOutDate, guestCount } = req.body;

  if (!roomId || !guestName || !checkInDate || !checkOutDate || !guestCount) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'roomId, guestName, checkInDate, checkOutDate, guestCount are required',
    });
  }

  const room = findRoomOr404(roomId, res);
  if (!room) return;

  if (room.status === 'maintenance') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Room is under maintenance',
    });
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

  if (isRoomBookedInRange(room.id, checkInDate, checkOutDate) || isRoomHeldInRange(room.id, checkInDate, checkOutDate)) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Room is already booked in this date range',
    });
  }

  const newBooking = {
    id: getNextBookingId(),
    roomId: room.id,
    guestName: String(guestName),
    guestPhone: guestPhone ? String(guestPhone) : null,
    checkInDate,
    checkOutDate,
    guestCount: Number(guestCount),
    status: 'reserved',
    createdAt: new Date().toISOString(),
  };

  bookings.push(newBooking);
  return res.status(201).json({ data: newBooking });
}

function precheckAndHold(req, res) {
  const { roomId, checkInDate, checkOutDate, guestCount } = req.body;

  if (!roomId || !checkInDate || !checkOutDate || !guestCount) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'roomId, checkInDate, checkOutDate, guestCount are required',
    });
  }

  if (!isDateRangeValid(checkInDate, checkOutDate)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'checkInDate must be before checkOutDate',
    });
  }

  const room = findRoomOr404(roomId, res);
  if (!room) return;

  if (room.status === 'maintenance') {
    return res.status(409).json({ error: 'Conflict', message: 'Room is under maintenance' });
  }

  if (Number(guestCount) > room.maxGuests) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `guestCount exceeds maxGuests (${room.maxGuests})`,
    });
  }

  if (isRoomBookedInRange(room.id, checkInDate, checkOutDate) || isRoomHeldInRange(room.id, checkInDate, checkOutDate)) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Room is no longer available for selected dates',
    });
  }

  const holdToken = `hold_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString();

  roomHolds.push({
    holdToken,
    roomId: room.id,
    checkInDate,
    checkOutDate,
    guestCount: Number(guestCount),
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  return res.json({
    data: {
      available: true,
      holdToken,
      holdExpiresAt: expiresAt,
      holdMinutes: HOLD_MINUTES,
    },
  });
}

function createPaymentIntent(req, res) {
  purgeExpiredHolds();
  const { holdToken, amount } = req.body;

  if (!holdToken) {
    return res.status(400).json({ error: 'Bad Request', message: 'holdToken is required' });
  }

  const hold = roomHolds.find((item) => item.holdToken === holdToken);
  if (!hold) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Hold token is invalid or expired',
    });
  }

  const paymentIntent = {
    id: getNextPaymentIntentId(),
    paymentIntentId: `pi_${crypto.randomUUID().slice(0, 12)}`,
    holdToken,
    amount: Number(amount) || 0,
    status: 'requires_confirmation',
    createdAt: new Date().toISOString(),
  };

  paymentIntents.push(paymentIntent);

  return res.json({
    data: {
      paymentIntentId: paymentIntent.paymentIntentId,
      status: paymentIntent.status,
    },
  });
}

function confirmBookingAfterPayment(req, res) {
  purgeExpiredHolds();
  const { holdToken, paymentIntentId, guestName, guestPhone } = req.body;

  if (!holdToken || !paymentIntentId || !guestName) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'holdToken, paymentIntentId, guestName are required',
    });
  }

  const hold = roomHolds.find((item) => item.holdToken === holdToken);
  if (!hold) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Hold token is invalid or expired',
    });
  }

  const intent = paymentIntents.find((item) => item.paymentIntentId === paymentIntentId && item.holdToken === holdToken);
  if (!intent) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Payment intent is invalid',
    });
  }

  if (intent.status === 'succeeded') {
    const existed = bookings.find((item) => item.paymentIntentId === paymentIntentId);
    if (existed) {
      return res.json({ data: existed, message: 'Booking already confirmed' });
    }
  }

  if (isRoomBookedInRange(hold.roomId, hold.checkInDate, hold.checkOutDate)) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Room was booked by another transaction',
    });
  }

  intent.status = 'succeeded';
  intent.paidAt = new Date().toISOString();

  const booking = {
    id: getNextBookingId(),
    roomId: hold.roomId,
    guestName: String(guestName),
    guestPhone: guestPhone ? String(guestPhone) : null,
    checkInDate: hold.checkInDate,
    checkOutDate: hold.checkOutDate,
    guestCount: hold.guestCount,
    status: 'reserved',
    paymentStatus: 'paid',
    paymentIntentId,
    holdToken,
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);

  const holdIndex = roomHolds.findIndex((item) => item.holdToken === holdToken);
  if (holdIndex >= 0) {
    roomHolds.splice(holdIndex, 1);
  }

  return res.status(201).json({ data: booking });
}

function releaseHold(req, res) {
  const { holdToken } = req.body;

  if (!holdToken) {
    return res.status(400).json({ error: 'Bad Request', message: 'holdToken is required' });
  }

  const index = roomHolds.findIndex((item) => item.holdToken === holdToken);
  if (index < 0) {
    return res.status(404).json({ error: 'Not Found', message: 'Hold token not found' });
  }

  roomHolds.splice(index, 1);
  return res.json({ data: { released: true } });
}

function checkInBooking(req, res) {
  const bookingId = Number(req.params.bookingId);
  const booking = bookings.find((item) => item.id === bookingId);

  if (!booking) {
    return res.status(404).json({ error: 'Not Found', message: 'Booking not found' });
  }

  if (booking.status !== 'reserved') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Only reserved booking can check in',
    });
  }

  const room = rooms.find((item) => item.id === booking.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Not Found', message: 'Room not found' });
  }

  room.status = 'occupied';
  booking.status = 'checked_in';
  booking.checkedInAt = new Date().toISOString();

  return res.json({ data: booking });
}

function checkOutBooking(req, res) {
  const bookingId = Number(req.params.bookingId);
  const booking = bookings.find((item) => item.id === bookingId);

  if (!booking) {
    return res.status(404).json({ error: 'Not Found', message: 'Booking not found' });
  }

  if (booking.status !== 'checked_in') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Only checked-in booking can check out',
    });
  }

  const room = rooms.find((item) => item.id === booking.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Not Found', message: 'Room not found' });
  }

  room.status = 'available';
  booking.status = 'checked_out';
  booking.checkedOutAt = new Date().toISOString();

  return res.json({ data: booking });
}

function cancelBooking(req, res) {
  const bookingId = Number(req.params.bookingId);
  const booking = bookings.find((item) => item.id === bookingId);

  if (!booking) {
    return res.status(404).json({ error: 'Not Found', message: 'Booking not found' });
  }

  if (booking.status === 'checked_out') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Cannot cancel an already checked-out booking',
    });
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date().toISOString();

  const room = rooms.find((item) => item.id === booking.roomId);
  if (room && room.status === 'occupied') {
    room.status = 'available';
  }

  return res.json({ data: booking });
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