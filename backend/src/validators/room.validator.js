const { z } = require('zod');

const createRoomSchema = z.object({
  roomNumber: z.string().min(1, 'roomNumber is required'),
  type: z.enum(['standard', 'deluxe', 'suite', 'family'], {
    errorMap: () => ({ message: 'type must be one of: standard, deluxe, suite, family' }),
  }),
  pricePerNight: z.number({ invalid_type_error: 'pricePerNight must be a number' }).positive('pricePerNight must be positive'),
  maxGuests: z
    .number({ invalid_type_error: 'maxGuests must be a number' })
    .int('maxGuests must be an integer')
    .positive('maxGuests must be positive'),
});

const updateRoomStatusSchema = z.object({
  status: z.enum(['available', 'occupied', 'maintenance'], {
    errorMap: () => ({ message: 'status must be one of: available, occupied, maintenance' }),
  }),
});

module.exports = { createRoomSchema, updateRoomStatusSchema };
