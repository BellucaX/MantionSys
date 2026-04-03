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
const { validate } = require('../middlewares/validate.middleware');
const {
  createBookingSchema,
  precheckSchema,
  paymentIntentSchema,
  confirmBookingSchema,
  releaseHoldSchema,
} = require('../validators/booking.validator');

const router = express.Router();

router.get('/', listBookings);
router.get('/:bookingId', getBookingById);
router.post('/', validate(createBookingSchema), createBooking);
router.post('/precheck', validate(precheckSchema), precheckAndHold);
router.post('/payment-intent', validate(paymentIntentSchema), createPaymentIntent);
router.post('/confirm', validate(confirmBookingSchema), confirmBookingAfterPayment);
router.post('/release-hold', validate(releaseHoldSchema), releaseHold);
router.patch('/:bookingId/check-in', checkInBooking);
router.patch('/:bookingId/check-out', checkOutBooking);
router.patch('/:bookingId/cancel', cancelBooking);

module.exports = router;