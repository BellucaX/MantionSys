const express = require('express');
const {
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
} = require('../controllers/bookings.controller');

const router = express.Router();

router.get('/', listBookings);
router.get('/:bookingId', getBookingById);
router.post('/', createBooking);
router.post('/precheck', precheckAndHold);
router.post('/payment-intent', createPaymentIntent);
router.post('/confirm', confirmBookingAfterPayment);
router.post('/release-hold', releaseHold);
router.patch('/:bookingId/check-in', checkInBooking);
router.patch('/:bookingId/check-out', checkOutBooking);
router.patch('/:bookingId/cancel', cancelBooking);

module.exports = router;