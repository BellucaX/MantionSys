# Mantion Project Structure

จัดโครงสร้างใหม่ให้แยก Frontend, Backend และ API ชัดเจน

## Project Layout

```text
Mantion/
  frontend/
    index.html
    admin.html
    admin.js
    style.css
    script.js

  backend/
    .env.example
    package.json
    package-lock.json
    src/
      app.js
      server.js
      config/
        env.js
      data/
        store.js
      controllers/
        admin.controller.js
        api.controller.js
        auth.controller.js
        bookings.controller.js
        health.controller.js
        rooms.controller.js
      middlewares/
        auth.middleware.js
        error.middleware.js
        not-found.middleware.js
        request-logger.middleware.js
      routes/
        admin.routes.js
        api.routes.js
        auth.routes.js
        bookings.routes.js
        rooms.routes.js
```

## Responsibilities

- `frontend/`:
  - เก็บไฟล์หน้าเว็บแบบ static
  - ใช้สำหรับ UI/UX ฝั่งผู้ใช้งาน

- `backend/src/server.js`:
  - จุดเริ่มต้นของเซิร์ฟเวอร์ (entry point)
  - เรียกใช้งาน app และเปิดพอร์ต

- `backend/src/app.js`:
  - รวม middleware และ map routes
  - แยกจาก server เพื่อให้ง่ายต่อการทดสอบ/ขยายระบบ

- `backend/src/config/`:
  - จัดการค่า environment เช่นพอร์ต

- `backend/src/controllers/`:
  - รวม logic ของ endpoint แต่ละกลุ่ม

- `backend/src/data/`:
  - เก็บข้อมูลเริ่มต้นของระบบ (ตอนนี้เป็น in-memory)

- `backend/src/routes/`:
  - ประกาศ URL path และจับคู่ไป controller

- `backend/src/middlewares/`:
  - รวม middleware ส่วนกลาง เช่น logger, 404, error handler

## API Endpoints

- `GET /` -> สถานะ backend
- `GET /api/health` -> health check ของ API
- `GET /api/hello` -> ตัวอย่าง endpoint

### Rooms

- `GET /api/rooms` -> ดูรายการห้องทั้งหมด
- `GET /api/rooms?status=available&type=deluxe` -> filter ห้อง
- `GET /api/rooms/:roomId` -> ดูรายละเอียดห้อง
- `POST /api/rooms` -> เพิ่มห้องใหม่
- `PATCH /api/rooms/:roomId/status` -> เปลี่ยนสถานะห้อง (`available`, `occupied`, `maintenance`)

ตัวอย่าง `POST /api/rooms`

```json
{
  "roomNumber": "301",
  "type": "suite",
  "pricePerNight": 3200,
  "maxGuests": 2
}
```

### Bookings

- `GET /api/bookings` -> ดูรายการจองทั้งหมด
- `GET /api/bookings/:bookingId` -> ดูรายละเอียดการจอง
- `POST /api/bookings` -> สร้างการจอง
- `POST /api/bookings/precheck` -> ตรวจห้องว่างและล็อกห้องชั่วคราว (hold)
- `POST /api/bookings/payment-intent` -> สร้าง payment intent จำลองจาก hold token
- `POST /api/bookings/confirm` -> ยืนยันการจองหลังชำระเงินสำเร็จ
- `POST /api/bookings/release-hold` -> ปล่อย hold กรณียกเลิกก่อนชำระเงิน
- `PATCH /api/bookings/:bookingId/check-in` -> เช็คอิน
- `PATCH /api/bookings/:bookingId/check-out` -> เช็คเอาต์
- `PATCH /api/bookings/:bookingId/cancel` -> ยกเลิกการจอง

ตัวอย่าง `POST /api/bookings`

```json
{
  "roomId": 1,
  "guestName": "Somchai",
  "guestPhone": "0812345678",
  "checkInDate": "2026-03-24",
  "checkOutDate": "2026-03-26",
  "guestCount": 2
}
```

ตัวอย่าง `POST /api/bookings/precheck`

```json
{
  "roomId": 1,
  "checkInDate": "2026-04-01",
  "checkOutDate": "2026-04-03",
  "guestCount": 2
}
```

ตัวอย่าง `POST /api/bookings/payment-intent`

```json
{
  "holdToken": "hold_xxxxx",
  "amount": 1500
}
```

ตัวอย่าง `POST /api/bookings/confirm`

```json
{
  "holdToken": "hold_xxxxx",
  "paymentIntentId": "pi_xxxxx",
  "guestName": "Somchai",
  "guestPhone": "0812345678"
}
```

### Authentication

- `POST /api/auth/register` -> สมัครสมาชิกด้วยอีเมล/รหัสผ่าน
- `POST /api/auth/login` -> เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน
- `POST /api/auth/google` -> Quick Login ด้วย Google ID Token
- `GET /api/auth/me` -> ข้อมูลผู้ใช้ปัจจุบัน (ต้องส่ง Bearer token)

ตัวอย่าง `POST /api/auth/register`

```json
{
  "name": "Demo User",
  "email": "demo@example.com",
  "password": "secret123"
}
```

ตัวอย่าง `POST /api/auth/login`

```json
{
  "email": "demo@example.com",
  "password": "secret123"
}
```

### Admin

- `POST /api/admin/login` -> เข้าสู่ระบบผู้ดูแลด้วย passcode
- `GET /api/admin/dashboard` -> ดูภาพรวมทั้งตึก (ต้องส่ง Bearer admin token)

ตัวอย่าง `POST /api/admin/login`

```json
{
  "passcode": "change_this_admin_passcode"
}
```

## Getting Started

### 1) Run Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend จะรันที่ `http://localhost:5000` (หรือพอร์ตจาก `.env`)

#### Backend Env (Auth)

ในไฟล์ `.env` ของ backend ให้ตั้งค่าดังนี้

```env
PORT=5000
JWT_SECRET=change_this_secret
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
ADMIN_PASSCODE=change_this_admin_passcode
```

### 2) Run Frontend (Static)

เลือกวิธีใดวิธีหนึ่ง

```bash
# Python 3
cd frontend
python3 -m http.server 8080
```

แล้วเปิด `http://localhost:8080`

#### Frontend Google Quick Login

ในไฟล์ `frontend/index.html` มี meta ชื่อ `google-signin-client_id` อยู่แล้ว
ให้แทนค่าเป็น Google Client ID ตัวเดียวกับ backend

### 3) Admin Dashboard

เปิดหน้า `frontend/admin.html` ผ่าน static server เดิม เช่น

```bash
cd frontend
python3 -m http.server 8080
```

แล้วเข้า `http://localhost:8080/admin.html` และกรอก `ADMIN_PASSCODE`

### 4) Run with Docker

ถ้าต้องการรันทั้ง frontend + backend ด้วย Docker:

```bash
docker compose up --build
```

Endpoints:

- Frontend: `http://localhost:8081`
- Admin: `http://localhost:8081/admin.html`
- Backend API: `http://localhost:5000/api`

หยุดระบบ:

```bash
docker compose down
```

## Next Suggested Improvements

- เพิ่ม `services/` และ `middlewares/` สำหรับ business logic และ error handling
- เพิ่ม request validation สำหรับ endpoint ที่รับ payload
- เพิ่ม test สำหรับ routes/controllers
