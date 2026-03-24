const { ADMIN_PASSCODE } = require('../config/env');
const { signAdminToken } = require('../utils/token');
const { rooms, bookings, roomHolds, purgeExpiredHolds } = require('../data/store');

function getDateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function adminLogin(req, res) {
  const { passcode } = req.body;

  if (!passcode) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'passcode is required',
    });
  }

  if (String(passcode) !== String(ADMIN_PASSCODE)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin passcode',
    });
  }

  const token = signAdminToken();
  return res.json({
    data: {
      token,
      role: 'admin',
      name: 'Administrator',
    },
  });
}

function getAdminDashboard(req, res) {
  purgeExpiredHolds();

  const today = getDateOnly(new Date().toISOString());

  const arrivalsToday = bookings.filter(
    (booking) => booking.status === 'reserved' && getDateOnly(booking.checkInDate) === today
  );

  const departuresToday = bookings.filter(
    (booking) => booking.status === 'checked_in' && getDateOnly(booking.checkOutDate) === today
  );

  const dueCheckIn = bookings.filter(
    (booking) => booking.status === 'reserved' && getDateOnly(booking.checkInDate) <= today
  );

  const dueCheckOut = bookings.filter(
    (booking) => booking.status === 'checked_in' && getDateOnly(booking.checkOutDate) <= today
  );

  const activeOrReservedStatuses = ['reserved', 'checked_in'];

  const roomOverview = rooms.map((room) => {
    const roomBookings = bookings
      .filter((booking) => booking.roomId === room.id)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const currentBooking = roomBookings.find((booking) => booking.status === 'checked_in')
      || roomBookings.find(
        (booking) => booking.status === 'reserved' && getDateOnly(booking.checkInDate) <= today
      )
      || roomBookings.find((booking) => booking.status === 'reserved');

    const roomHold = roomHolds.find((hold) => hold.roomId === room.id) || null;

    return {
      id: room.id,
      roomNumber: room.roomNumber,
      type: room.type,
      roomStatus: room.status,
      hasIncomingToday: roomBookings.some(
        (booking) => booking.status === 'reserved' && getDateOnly(booking.checkInDate) === today
      ),
      hasOutgoingToday: roomBookings.some(
        (booking) => booking.status === 'checked_in' && getDateOnly(booking.checkOutDate) === today
      ),
      currentBooking: currentBooking
        ? {
            id: currentBooking.id,
            guestName: currentBooking.guestName,
            guestPhone: currentBooking.guestPhone,
            checkInDate: currentBooking.checkInDate,
            checkOutDate: currentBooking.checkOutDate,
            status: currentBooking.status,
          }
        : null,
      hold: roomHold
        ? {
            holdToken: roomHold.holdToken,
            checkInDate: roomHold.checkInDate,
            checkOutDate: roomHold.checkOutDate,
            expiresAt: roomHold.expiresAt,
          }
        : null,
    };
  });

  return res.json({
    data: {
      date: today,
      summary: {
        totalRooms: rooms.length,
        availableRooms: rooms.filter((room) => room.status === 'available').length,
        occupiedRooms: rooms.filter((room) => room.status === 'occupied').length,
        maintenanceRooms: rooms.filter((room) => room.status === 'maintenance').length,
        activeBookings: bookings.filter((booking) => activeOrReservedStatuses.includes(booking.status)).length,
        arrivalsToday: arrivalsToday.length,
        departuresToday: departuresToday.length,
        waitingCheckIn: dueCheckIn.length,
        waitingCheckOut: dueCheckOut.length,
      },
      arrivalsToday,
      departuresToday,
      waitingCheckIn: dueCheckIn,
      waitingCheckOut: dueCheckOut,
      roomOverview,
    },
  });
}

module.exports = {
  adminLogin,
  getAdminDashboard,
};
