# Mantion Project Structure (Frontend / Backend / API)

เอกสารนี้สรุปโครงสร้างโปรเจกต์แบบแยกชัดเจน 3 ส่วน: Frontend, Backend, API

---

## 1) Frontend

ตำแหน่ง: `frontend/`

```text
frontend/
  index.html        # หน้าเว็บหลักสำหรับลูกค้า
  admin.html        # หน้าแดชบอร์ดผู้ดูแล
  script.js         # logic ฝั่งลูกค้า (auth + booking flow)
  admin.js          # logic ฝั่งแอดมิน (login + dashboard + check-in/out)
  style.css         # style ทั้งเว็บ (รวม style ฝั่ง admin)
  Dockerfile        # image สำหรับเสิร์ฟ static ด้วย nginx
  .dockerignore
```

หน้าที่หลัก:
- แสดงผล UI ฝั่งผู้ใช้งานและผู้ดูแล
- เรียก API ไปที่ backend ผ่าน HTTP (`/api/...`)

---

## 2) Backend

ตำแหน่ง: `backend/`

```text
backend/
  package.json
  package-lock.json
  Dockerfile
  .dockerignore
  .env.example
  mock_admin_server.py   # mock server สำหรับทดสอบ admin แบบไม่ใช้ Node

  src/
    server.js            # start server และ listen port
    app.js               # ตั้งค่า express, middleware, mount routes

    config/
      env.js             # โหลดค่า env (PORT, JWT_SECRET, ADMIN_PASSCODE)

    controllers/
      api.controller.js
      health.controller.js
      auth.controller.js
      rooms.controller.js
      bookings.controller.js
      admin.controller.js

    routes/
      api.routes.js      # root ของ /api
      auth.routes.js
      rooms.routes.js
      bookings.routes.js
      admin.routes.js

    middlewares/
      auth.middleware.js
      request-logger.middleware.js
      not-found.middleware.js
      error.middleware.js

    data/
      store.js           # in-memory data store

    utils/
      token.js           # JWT helper
```

หน้าที่หลัก:
- ประมวลผล business logic
- ตรวจสอบสิทธิ์ (Bearer token / admin)
- จัดการข้อมูลห้องพักและการจอง

---

## 3) API

Base URL:
- Local: `http://localhost:5000/api`
- ผ่าน Docker (ค่าในโปรเจกต์ปัจจุบัน): `http://localhost:5000/api`

Entry mapping:
- `GET /` -> health root (นอก `/api`)
- `GET /api/hello`
- `GET /api/health`

### 3.1 Auth API (`/api/auth`)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me` (ต้อง Bearer token)

### 3.2 Admin API (`/api/admin`)
- `POST /api/admin/login`
- `GET /api/admin/dashboard` (ต้อง Bearer admin token)

### 3.3 Rooms API (`/api/rooms`)
- `GET /api/rooms`
- `GET /api/rooms/:roomId`
- `POST /api/rooms`
- `PATCH /api/rooms/:roomId/status`

### 3.4 Bookings API (`/api/bookings`)
- `GET /api/bookings`
- `GET /api/bookings/:bookingId`
- `POST /api/bookings`
- `POST /api/bookings/precheck`
- `POST /api/bookings/payment-intent`
- `POST /api/bookings/confirm`
- `POST /api/bookings/release-hold`
- `PATCH /api/bookings/:bookingId/check-in`
- `PATCH /api/bookings/:bookingId/check-out`
- `PATCH /api/bookings/:bookingId/cancel`

---

## 4) Runtime Ports (ปัจจุบัน)

- Backend: `5000`
- Frontend (Docker): `8081`
- Frontend (python static server เดิม): มักใช้ `8080`

หมายเหตุ: ถ้าเปิด static server ที่ `8080` อยู่แล้ว ให้เข้า frontend ผ่าน Docker ที่ `8081` เพื่อไม่ชนพอร์ต
