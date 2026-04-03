const API_BASE = window.MANTION_API_BASE || 'http://localhost:5001/api';
const ADMIN_TOKEN_KEY = 'mantionAdminToken';

const adminLoginForm = document.getElementById('adminLoginForm');
const adminAuthStatus = document.getElementById('adminAuthStatus');
const adminSummary = document.getElementById('adminSummary');
const arrivalsList = document.getElementById('arrivalsList');
const departuresList = document.getElementById('departuresList');
const roomGrid = document.getElementById('roomGrid');
const refreshDashboardBtn = document.getElementById('refreshDashboardBtn');

function setAuthStatus(message) {
  if (adminAuthStatus) {
    adminAuthStatus.textContent = message;
  }
}

function saveAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

function renderSummary(summary) {
  if (!adminSummary) return;

  const items = [
    ['ห้องทั้งหมด', summary.totalRooms],
    ['ห้องว่าง', summary.availableRooms],
    ['ห้องไม่ว่าง', summary.occupiedRooms],
    ['ซ่อมบำรุง', summary.maintenanceRooms],
    ['จองที่กำลังใช้งาน', summary.activeBookings],
    ['จะเข้า (วันนี้)', summary.arrivalsToday],
    ['จะออก (วันนี้)', summary.departuresToday],
    ['รอเช็คอิน', summary.waitingCheckIn],
    ['รอเช็คเอาท์', summary.waitingCheckOut],
  ];

  adminSummary.innerHTML = items
    .map(
      ([label, value]) => `
        <article class="admin-stat">
          <p>${label}</p>
          <strong>${value}</strong>
        </article>
      `
    )
    .join('');
}

function bookingItemHtml(booking, label) {
  return `
    <div class="admin-list-item">
      <strong>${label} #${booking.id}</strong>
      <span>ห้อง ${booking.roomId} | ${booking.guestName}</span>
      <span>${booking.checkInDate} → ${booking.checkOutDate}</span>
      <span>สถานะ: ${booking.status}</span>
    </div>
  `;
}

function renderArrivals(arrivals, waitingCheckIn) {
  if (!arrivalsList) return;

  const arrivalHtml = arrivals.map((booking) => bookingItemHtml(booking, 'จะเข้า')).join('');
  const waitingHtml = waitingCheckIn.map((booking) => bookingItemHtml(booking, 'รอเช็คอิน')).join('');

  const html = `${arrivalHtml}${waitingHtml}`;
  arrivalsList.innerHTML = html || '<p>ไม่มีรายการเข้า / เช็คอินในตอนนี้</p>';
}

function renderDepartures(departures, waitingCheckOut) {
  if (!departuresList) return;

  const departureHtml = departures.map((booking) => bookingItemHtml(booking, 'จะออก')).join('');
  const waitingHtml = waitingCheckOut.map((booking) => bookingItemHtml(booking, 'รอเช็คเอาท์')).join('');

  const html = `${departureHtml}${waitingHtml}`;
  departuresList.innerHTML = html || '<p>ไม่มีรายการออก / เช็คเอาท์ในตอนนี้</p>';
}

function roomActionButtons(room) {
  if (!room.currentBooking) return '';

  if (room.currentBooking.status === 'reserved') {
    return `<button class="btn btn-primary admin-action-btn" data-action="check-in" data-booking-id="${room.currentBooking.id}">เช็คอิน</button>`;
  }

  if (room.currentBooking.status === 'checked_in') {
    return `<button class="btn btn-ghost admin-action-btn" data-action="check-out" data-booking-id="${room.currentBooking.id}">เช็คเอาท์</button>`;
  }

  return '';
}

function renderRooms(rooms) {
  if (!roomGrid) return;

  roomGrid.innerHTML = rooms
    .map((room) => {
      const bookingLine = room.currentBooking
        ? `
          <p><strong>ผู้เข้าพัก:</strong> ${room.currentBooking.guestName}</p>
          <p><strong>ช่วงพัก:</strong> ${room.currentBooking.checkInDate} → ${room.currentBooking.checkOutDate}</p>
          <p><strong>สถานะจอง:</strong> ${room.currentBooking.status}</p>
        `
        : '<p>ไม่มีรายการจองปัจจุบัน</p>';

      const holdLine = room.hold
        ? `<p><strong>Hold:</strong> ถึง ${room.hold.expiresAt}</p>`
        : '';

      const todayFlags = [
        room.hasIncomingToday ? 'มีคนจะเข้าวันนี้' : null,
        room.hasOutgoingToday ? 'มีคนจะออกวันนี้' : null,
      ]
        .filter(Boolean)
        .join(' | ');

      return `
        <article class="admin-room-item">
          <div class="admin-room-head">
            <h4>ห้อง ${room.roomNumber}</h4>
            <span>${room.roomStatus}</span>
          </div>
          <p><strong>ประเภท:</strong> ${room.type}</p>
          ${bookingLine}
          ${holdLine}
          ${todayFlags ? `<p><strong>วันนี้:</strong> ${todayFlags}</p>` : ''}
          <div class="admin-actions">${roomActionButtons(room)}</div>
        </article>
      `;
    })
    .join('');
}

async function fetchDashboard() {
  const token = getAdminToken();
  if (!token) {
    setAuthStatus('ยังไม่ได้เข้าสู่ระบบผู้ดูแล');
    return;
  }

  try {
    const result = await requestJson(`${API_BASE}/admin/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const dashboard = result.data;
    setAuthStatus(`เข้าสู่ระบบผู้ดูแลแล้ว | ข้อมูลวันที่ ${dashboard.date}`);
    renderSummary(dashboard.summary);
    renderArrivals(dashboard.arrivalsToday, dashboard.waitingCheckIn);
    renderDepartures(dashboard.departuresToday, dashboard.waitingCheckOut);
    renderRooms(dashboard.roomOverview);
  } catch (error) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAuthStatus(`ดึงข้อมูล dashboard ไม่สำเร็จ: ${error.message}`);
  }
}

async function loginAdmin(passcode) {
  const result = await requestJson(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ passcode }),
  });

  saveAdminToken(result.data.token);
}

async function handleBookingAction(action, bookingId) {
  const actionPath = action === 'check-in' ? 'check-in' : 'check-out';

  try {
    await requestJson(`${API_BASE}/bookings/${bookingId}/${actionPath}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await fetchDashboard();
  } catch (error) {
    setAuthStatus(`อัปเดตสถานะไม่สำเร็จ: ${error.message}`);
  }
}

if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(adminLoginForm);
    const passcode = String(formData.get('passcode') || '');

    if (!passcode) {
      setAuthStatus('กรุณากรอกรหัสผู้ดูแล');
      return;
    }

    try {
      await loginAdmin(passcode);
      setAuthStatus('เข้าสู่ระบบผู้ดูแลสำเร็จ กำลังโหลด dashboard...');
      adminLoginForm.reset();
      await fetchDashboard();
    } catch (error) {
      setAuthStatus(`เข้าสู่ระบบผู้ดูแลไม่สำเร็จ: ${error.message}`);
    }
  });
}

if (refreshDashboardBtn) {
  refreshDashboardBtn.addEventListener('click', fetchDashboard);
}

if (roomGrid) {
  roomGrid.addEventListener('click', async (event) => {
    const button = event.target.closest('.admin-action-btn');
    if (!button) return;

    const action = button.getAttribute('data-action');
    const bookingId = Number(button.getAttribute('data-booking-id'));
    if (!action || !bookingId) return;

    await handleBookingAction(action, bookingId);
  });
}

fetchDashboard();
