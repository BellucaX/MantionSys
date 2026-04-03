const { ADMIN_PASSCODE } = require('../config/env');
const { signAdminToken } = require('../utils/token');
const db = require('../db/connection');

function adminLogin(req, res) {
  const { passcode } = req.body;

  if (!passcode) {
    return res.status(400).json({ error: 'Bad Request', message: 'passcode is required' });
  }

  if (String(passcode) !== String(ADMIN_PASSCODE)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin passcode' });
  }

  const token = signAdminToken();
  return res.json({ data: { token, role: 'admin', name: 'Administrator' } });
}

function getAdminDashboard(req, res) {
  // Purge expired holds
  db.prepare('DELETE FROM room_holds WHERE expiresAt <= ?').run(new Date().toISOString());

  const today = new Date().toISOString().slice(0, 10);

  // Aggregate summary from DB
  const summary = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM rooms)                                                  AS totalRooms,
        (SELECT COUNT(*) FROM rooms WHERE status = 'available')                       AS availableRooms,
        (SELECT COUNT(*) FROM rooms WHERE status = 'occupied')                        AS occupiedRooms,
        (SELECT COUNT(*) FROM rooms WHERE status = 'maintenance')                     AS maintenanceRooms,
        (SELECT COUNT(*) FROM bookings WHERE status IN ('reserved','checked_in'))     AS activeBookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'reserved'
          AND substr(checkInDate,1,10) = ?)                                           AS arrivalsToday,
        (SELECT COUNT(*) FROM bookings WHERE status = 'checked_in'
          AND substr(checkOutDate,1,10) = ?)                                          AS departuresToday,
        (SELECT COUNT(*) FROM bookings WHERE status = 'reserved'
          AND substr(checkInDate,1,10) <= ?)                                          AS waitingCheckIn,
        (SELECT COUNT(*) FROM bookings WHERE status = 'checked_in'
          AND substr(checkOutDate,1,10) <= ?)                                         AS waitingCheckOut
      `
    )
    .get(today, today, today, today);

  const arrivalsToday = db
    .prepare(`SELECT * FROM bookings WHERE status = 'reserved' AND substr(checkInDate,1,10) = ?`)
    .all(today);

  const departuresToday = db
    .prepare(`SELECT * FROM bookings WHERE status = 'checked_in' AND substr(checkOutDate,1,10) = ?`)
    .all(today);

  const waitingCheckIn = db
    .prepare(`SELECT * FROM bookings WHERE status = 'reserved' AND substr(checkInDate,1,10) <= ?`)
    .all(today);

  const waitingCheckOut = db
    .prepare(`SELECT * FROM bookings WHERE status = 'checked_in' AND substr(checkOutDate,1,10) <= ?`)
    .all(today);

  const rooms = db.prepare('SELECT * FROM rooms').all();

  const roomOverview = rooms.map((room) => {
    // Find current booking: checked_in first, then soonest reserved
    const currentBooking = db
      .prepare(
        `SELECT * FROM bookings
         WHERE roomId = ? AND status = 'checked_in'
         LIMIT 1`
      )
      .get(room.id)
      || db
        .prepare(
          `SELECT * FROM bookings
           WHERE roomId = ? AND status = 'reserved' AND substr(checkInDate,1,10) <= ?
           ORDER BY checkInDate ASC LIMIT 1`
        )
        .get(room.id, today)
      || db
        .prepare(
          `SELECT * FROM bookings
           WHERE roomId = ? AND status = 'reserved'
           ORDER BY checkInDate ASC LIMIT 1`
        )
        .get(room.id);

    const roomHold = db
      .prepare('SELECT * FROM room_holds WHERE roomId = ? LIMIT 1')
      .get(room.id);

    return {
      id: room.id,
      roomNumber: room.roomNumber,
      type: room.type,
      roomStatus: room.status,
      hasIncomingToday: !!db
        .prepare(
          `SELECT id FROM bookings WHERE roomId = ? AND status = 'reserved' AND substr(checkInDate,1,10) = ? LIMIT 1`
        )
        .get(room.id, today),
      hasOutgoingToday: !!db
        .prepare(
          `SELECT id FROM bookings WHERE roomId = ? AND status = 'checked_in' AND substr(checkOutDate,1,10) = ? LIMIT 1`
        )
        .get(room.id, today),
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
      summary,
      arrivalsToday,
      departuresToday,
      waitingCheckIn,
      waitingCheckOut,
      roomOverview,
    },
  });
}

module.exports = { adminLogin, getAdminDashboard };
