const { z } = require('zod');

const registerSchema = z
  .object({
    name: z.string().min(1, 'name is required'),
    email: z.string().email('email must be a valid email address'),
    password: z.string().min(6, 'password must be at least 6 characters'),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) =>
      data.confirmPassword === undefined || data.confirmPassword === data.password,
    { message: 'password and confirmPassword must match', path: ['confirmPassword'] }
  );

const loginSchema = z.object({
  email: z.string().email('email must be a valid email address'),
  password: z.string().min(1, 'password is required'),
});

const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
});

module.exports = { registerSchema, loginSchema, googleLoginSchema };
