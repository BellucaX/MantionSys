const rooms = [
  {
    id: 1,
    roomNumber: '101',
    type: 'standard',
    pricePerNight: 900,
    status: 'available',
    maxGuests: 2,
  },
  {
    id: 2,
    roomNumber: '102',
    type: 'deluxe',
    pricePerNight: 1400,
    status: 'available',
    maxGuests: 2,
  },
  {
    id: 3,
    roomNumber: '201',
    type: 'family',
    pricePerNight: 2200,
    status: 'available',
    maxGuests: 4,
  },
];

const bookings = [];
const users = [];
const roomHolds = [];
const paymentIntents = [];

let nextRoomId = rooms.length + 1;
let nextBookingId = 1;
let nextUserId = 1;
let nextPaymentIntentId = 1;

function getNextRoomId() {
  return nextRoomId++;
}

function getNextBookingId() {
  return nextBookingId++;
}

function getNextUserId() {
  return nextUserId++;
}

function getNextPaymentIntentId() {
  return nextPaymentIntentId++;
}

function purgeExpiredHolds() {
  const now = Date.now();
  for (let index = roomHolds.length - 1; index >= 0; index -= 1) {
    const hold = roomHolds[index];
    if (new Date(hold.expiresAt).getTime() <= now) {
      roomHolds.splice(index, 1);
    }
  }
}

module.exports = {
  rooms,
  bookings,
  users,
  roomHolds,
  paymentIntents,
  getNextRoomId,
  getNextBookingId,
  getNextUserId,
  getNextPaymentIntentId,
  purgeExpiredHolds,
};