const { z } = require('zod');

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const createBookingSchema = z.object({
  roomId: z
    .number({ invalid_type_error: 'roomId must be a number' })
    .int()
    .positive('roomId must be positive'),
  guestName: z.string().min(1, 'guestName is required'),
  guestPhone: z.string().optional(),
  checkInDate: dateString,
  checkOutDate: dateString,
  guestCount: z
    .number({ invalid_type_error: 'guestCount must be a number' })
    .int()
    .positive('guestCount must be at least 1'),
});

const precheckSchema = z.object({
  roomId: z
    .number({ invalid_type_error: 'roomId must be a number' })
    .int()
    .positive(),
  checkInDate: dateString,
  checkOutDate: dateString,
  guestCount: z
    .number({ invalid_type_error: 'guestCount must be a number' })
    .int()
    .positive(),
});

const paymentIntentSchema = z.object({
  holdToken: z.string().min(1, 'holdToken is required'),
  amount: z
    .number({ invalid_type_error: 'amount must be a number' })
    .nonnegative()
    .optional(),
});

const confirmBookingSchema = z.object({
  holdToken: z.string().min(1, 'holdToken is required'),
  paymentIntentId: z.string().min(1, 'paymentIntentId is required'),
  guestName: z.string().min(1, 'guestName is required'),
  guestPhone: z.string().optional(),
});

const releaseHoldSchema = z.object({
  holdToken: z.string().min(1, 'holdToken is required'),
});

module.exports = {
  createBookingSchema,
  precheckSchema,
  paymentIntentSchema,
  confirmBookingSchema,
  releaseHoldSchema,
};
