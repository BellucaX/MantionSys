# Mantion System Review (Overview)

เอกสารนี้สรุประบบแบบคร่าวๆ ว่าแต่ละส่วนมีอะไรและทำหน้าที่อะไร

## 1) ภาพรวมระบบ

โปรเจกต์ถูกแยกเป็น 2 ฝั่งชัดเจน

- Frontend: หน้าเว็บแบบ static
- Backend API: ระบบจัดการห้องพักและการจอง

สถาปัตยกรรมปัจจุบันเป็นแบบ Monolith ขนาดเล็ก ที่แยกชั้นภายใน backend เป็น route/controller/middleware/data แล้ว

## 2) โครงสร้างหลัก

```text
Mantion/
  frontend/
    index.html
    style.css
    script.js

  backend/
    .env.example
    package.json
    package-lock.json
    src/
      server.js
      app.js
      config/
        env.js
      data/
        store.js
      controllers/
        api.controller.js
        health.controller.js
        rooms.controller.js
        bookings.controller.js
      routes/
        api.routes.js
        rooms.routes.js
        bookings.routes.js
      middlewares/
        request-logger.middleware.js
        not-found.middleware.js
        error.middleware.js
```

## 3) อธิบายแต่ละส่วน

### Frontend

- `index.html`: โครงหน้าเว็บหลัก
- `style.css`: สไตล์ทั้งหมด
- `script.js`: JS ฝั่งหน้าเว็บ (ตอนนี้ยังเบา)

สถานะ: ใช้เป็น UI หน้าเว็บเบื้องต้น ยังไม่ผูก API แบบเต็มรูปแบบ

### Backend Entry

- `src/server.js`: จุดเริ่มเปิดเซิร์ฟเวอร์ อ่าน PORT และ start app
- `src/app.js`: รวม middleware และ mount routes

สถานะ: โครงดีสำหรับขยายต่อและทำ test

### Config

- `src/config/env.js`: โหลดค่า environment เช่น PORT

สถานะ: พร้อมใช้งาน และแยกความรับผิดชอบได้ถูกต้อง

### Data Layer (In-Memory)

- `src/data/store.js`: เก็บ rooms/bookings ในหน่วยความจำ

สถานะ: เหมาะกับ dev/prototype
ข้อจำกัด: รีสตาร์ตเซิร์ฟเวอร์แล้วข้อมูลหาย

### Controllers

- `api.controller.js`: endpoint ทดสอบพื้นฐาน
- `health.controller.js`: health endpoints
- `rooms.controller.js`: จัดการห้องพัก (list/detail/create/update status)
- `bookings.controller.js`: จัดการการจองและ workflow check-in/check-out/cancel

สถานะ: ครบสำหรับระบบพื้นฐานโรงแรม

### Routes

- `api.routes.js`: จุดรวม route ใต้ `/api`
- `rooms.routes.js`: route ของห้องพัก
- `bookings.routes.js`: route ของการจอง

สถานะ: แยกโมดูลชัดเจน อ่านง่าย

### Middlewares

- `request-logger.middleware.js`: log method/path/status/time
- `not-found.middleware.js`: จัดการ 404 route
- `error.middleware.js`: จัดการ error กลาง + invalid JSON

สถานะ: ครบสำหรับ baseline production-like flow (ยังไม่รวม security ตาม requirement)

## 4) ความสามารถที่มีตอนนี้

### Rooms

- ดูห้องทั้งหมด และ filter ได้
- ดูห้องรายห้อง
- เพิ่มห้องใหม่
- เปลี่ยนสถานะห้อง (`available`, `occupied`, `maintenance`)

### Bookings

- ดูรายการจองทั้งหมด
- ดูรายการจองราย ID
- สร้างการจอง
- เช็คอิน
- เช็คเอาต์
- ยกเลิกการจอง

### Booking Rules พื้นฐานที่มีแล้ว

- กันจองทับช่วงวัน
- จำกัดจำนวนผู้เข้าพักไม่เกิน maxGuests
- กันจองห้องที่อยู่สถานะ maintenance
- บังคับลำดับสถานะ เช่น check-out ได้เฉพาะรายการที่ checked-in

## 5) ลำดับการไหลของ request

1. Request เข้า `app.js`
2. ผ่าน middlewares (cors/json/urlencoded/logger)
3. เข้า route ที่ match
4. ส่งต่อไป controller
5. ถ้าไม่เจอ route -> not-found middleware
6. ถ้าเกิด exception/parse error -> error middleware

## 6) จุดแข็งของโครงปัจจุบัน

- แยก frontend/backend ชัด
- แยก route/controller/middleware/data ชัด
- API workflow โรงแรมพื้นฐานครบ
- มี logging และ error handling กลาง

## 7) ข้อจำกัดปัจจุบัน (รับทราบไว้)

- ยังใช้ in-memory (ข้อมูลไม่ถาวร)
- ยังไม่มี auth/role
- ยังไม่มี validation framework แบบ schema
- ยังไม่มี automated tests

## 8) สรุปสั้น

ตอนนี้ระบบอยู่ในสถานะ “ใช้งานพื้นฐานได้จริง” สำหรับงานโรงแรมเบื้องต้น โดยโครงสร้างรองรับการขยายไปฐานข้อมูลจริงและระบบเต็มรูปแบบต่อได้ดี
