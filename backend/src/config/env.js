require('dotenv').config();

const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'mantion-dev-secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'admin1234';
const DB_PATH = process.env.DB_PATH || './mantion.db';
const PROMPTPAY_ID = process.env.PROMPTPAY_ID || '0812345678';

module.exports = {
  PORT,
  JWT_SECRET,
  GOOGLE_CLIENT_ID,
  ADMIN_PASSCODE,
  DB_PATH,
  PROMPTPAY_ID,
};