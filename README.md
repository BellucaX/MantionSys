# MantionSys (P.P Mantion System)

ระบบบริหารจัดการห้องพัก `MantionSys` ถูกออกแบบและพัฒนาใหม่ทั้งหมดเพื่อให้บริการจองห้องพักทั้งในรูปแบบรายวันและรายเดือน (Boutique Living) ระบบนี้ทำงานแบบแยกส่วน (Decoupled Architecture) บนสถาปัตยกรรม 3-Tier เพื่อให้ทุกส่วนสามารถพัฒนา ทดสอบ และปรับปรุงได้อย่างเป็นเอกเทศ

เอกสารนี้ตั้งใจเขียนขึ้นเพื่อให้นักพัฒนาและผู้ที่สนใจสามารถเข้ามาศึกษา และทำความเข้าใจสถาปัตยกรรมแบบ Layer ของโปรเจกต์ได้อย่างง่ายดาย

---

## 🏗️ Project Architecture & Layers

โปรเจกต์นี้แบ่งโครงสร้างหลักออกเป็น 5 Layer ที่ทำงานเชื่อมโยงกันอย่างเป็นระบบ โครงสร้างไฟล์โดยรวมจะเป็นดังนี้:

```text
MantionSys/
  ├── frontend/         # 1. UI / Frontend Layer
  ├── backend/
  │   ├── src/
  │   │   ├── routes/       # 2. API / Routing Layer
  │   │   ├── controllers/  # 3. Backend / Business Logic Layer
  │   │   ├── middlewares/  # 3.1 Security & Request Parsing Layer
  │   │   ├── db/           # 4. Database / Persistence Layer
  │   │   ├── server.js     # 5. Server / Entry Point Layer
  │   │   └── app.js
  │   └── prisma/           # ส่วนเสริมสำหรับการรองรับ ORM ในอนาคต
  └── docs/                 # แหล่งรวมเอกสารเพิ่มเติม
```

---

### 1. Frontend Layer (ฝั่งผู้ใช้งานและ Admin)
หน้าบ้านสำหรับสื่อสารกับผู้ใช้งานโดยรันเป็น Static Site ไม่ต้องใช้ Node.js รัน (อาจใช้ Nginx หรือ Live Server ธรรมดาก็ได้)

* **ตำแหน่งไฟล์:** `frontend/`
* **รายละเอียด:**
    * **`index.html`**: หน้าเว็บไซต์หลัก รวบรวมฟังก์ชันการจองห้องพัก, ดูข้อมูลโรงแรม เกรดพรีเมียม
    * **`payment.html`**: ทำหน้าที่รับข้อมูลจำลองการชำระเงินผ่าน PromptPay และการอัปโหลดสลิป
    * **`admin.html`**: แดชบอร์ดสำหรับผู้ดูแลระบบ ดูสถิติ และการยืนยันการจอง
    * **`css/`** และ **`js/`**: ไฟล์ Stylesheet (CSS) และไฟล์ JavaScript (JS) ที่ควบคุมการเชื่อมต่อ API ไปที่ส่วนหลังบ้าน

---

### 2. API / Routing Layer (ด่านหน้ารับ HTTP Request)
ชั้นนี้ทำหน้าที่แปลง URL / Path จากโลกภายนอก (Frontend) เข้ามายังโปรแกรมของเรา

* **ตำแหน่งไฟล์:** `backend/src/routes/`
* **รายละเอียด:** 
  ในนี้จะพบไฟล์ที่มีนามสกุล `.routes.js` ซ่อนอยู่ เช่น `auth.routes.js`, `rooms.routes.js`, `bookings.routes.js` ชั้นนี้ทำตัวเป็น **"ป้ายบอกทาง"** ว่าเมื่อ Frontend ร้องขอด้วยหน้า URL หนึ่งๆ จะต้องไปเรียกฟังก์ชันไหนมาดึงข้อมูล 
  *ไม่มีการคำนวณข้อมูลหรือการแก้ไขฐานข้อมูลใน Layer นี้โดยเด็ดขาด*

---

### 3. Backend (Business Logic & Controllers Layer)
ส่วนมันสมองของระบบ กฎเกณฑ์และตรรกะทั้งหมดจะถูกกำหนดในชั้นนี้

* **ตำแหน่งไฟล์:** `backend/src/controllers/`
* **รายละเอียด:**
  จะรับช่วงต่อมาจาก Routing เพื่อทำลอจิก เช่น "การจองห้องสำเร็จต้องทำอะไรบ้าง?" "เช็คห้องว่างยังไง?" "รหัสผ่านถูกต้องไหม?"
  *ฟังก์ชันที่นี่จะดึงข้อมูลผ่านฝั่ง Database ก่อนจะประมวลผลและบรรจุส่งคืน (Return) ไปที่ Frontend ว่า `status 200 (สำเร็จ)` หรือ `status 400 (ล้มเหลว)`*

* **3.1 Middlewares (`backend/src/middlewares/`)**:  
  เพื่อนบ้านของ Controller ที่คอยสกัดจับก่อนข้อมูลเข้าไปประมวลผล เช่น เช็คว่าคนนี้มี Token เข้าสู่ระบบมาแล้วหรือยัง (`auth.middleware.js`) ก่อนจะปล่อยผ่านเข้าไปหา Controllers

---

### 4. DB & Data Layer (ชั้นจัดเก็บข้อมูล)
เก็บรักษาข้อมูลที่สำคัญไม่ให้สูญหายหลังจากการใช้งาน

* **ตำแหน่งไฟล์:** `backend/src/db/` (และ `backend/prisma/`)
* **รายละเอียด:**
  ในเวอร์ชันนี้เราจัดการเชื่อมต่อฐานข้อมูลในรูปแบบ **SQLite** เป็นหัวใจหลักเพื่อความรวดเร็วและสามารถย้ายสถาปัตยกรรม (Portability) ได้ทันที 
  * `connection.js`: ประกาศตัวเชื่อมไปยังไฟล์ `database.db`
  * `schema.sql`: โครงสร้างตาราง (Tables) ทั้งหมดประกอบด้วย (Users, Rooms, Bookings)
  * `migrate.js` และ `seeds.js`: นำไว้ใช้สำหรับสร้างตารางและรันข้อมูลจำลองเริ่มต้น

> [!NOTE]
> ปัจจุบันโปรเจกต์มีโครงสร้างของ `Prisma ORM` วางเตรียมเอาไว้ที่โฟลเดอร์ `backend/prisma` ด้วย ซึ่งเป็นทางเลือกสำหรับการสเกลระบบไปใช้ฐานข้อมูลใหญ่ขึ้นในอนาคต

---

### 5. Server & Application Entry Layer (จุดสตาร์ทอัปเซิร์ฟเวอร์)
ชั้นสุดท้ายที่รวมทุกชั้น (Layer) เข้ามาด้วยกันให้เริ่มทำงานเพื่อเปิดรับ Request จากภายนอก

* **ตำแหน่งไฟล์:** `backend/src/server.js` และ `backend/src/app.js`
* **รายละเอียด:**
  * **`app.js`**: ตัวผูกรวมความสามารถต่างๆ (Routes, Middlewares) ไว้เป็น Application เดี่ยวๆ สามารถนำไฟล์นี้ไปใช้ทำงานสำหรับ **Automated Testing** ได้โดยสะดวก
  * **`server.js`**: เป็นไฟล์รันไทม์เท่านั้น ผูกเอา `app` ไปวิ่งบน Port ที่กำหนด (ตัวอย่างเช่น Port `5001` หรือ `5000`)

---

## 🚀 Getting Started (วิธีการพารันขึ้นทำงาน)

### 1) การเชื่อมต่อ Database & ฝั่ง Backend
```bash
cd backend
npm install
cp .env.example .env
npm run setup:db   # สร้างตาราง SQLite และ Seed ข้อมูลเริ่มต้น
npm run dev        # เริ่มการทำงานของ Server (ระบบจะเปิดที่ http://localhost:5001)
```

> **Environment Variables สำคัญใน `.env`**
> * `PORT`=5001
> * `JWT_SECRET`=#####
> * `ADMIN_PASSCODE`=######

### 2) การแสดงผลฝั่ง Frontend
โปรเจกต์ไม่ได้บังคับใช้งานไลบรารีใดสำหรับรันโปรเจกต์ สามารถใช้ Live Server Plugin ของ VS Code เพื่อจำลองเป็น Web Server ได้เลย หรือสามารถรันผ่านคำสั่ง Terminal:
```bash
cd frontend
python3 -m http.server 8080
# หรือ
npx serve .
```

* เข้าชมหน้าบ้านได้ที่ `http://localhost:8080`
* เข้าชมระบบแอดมินได้ที่ `http://localhost:8080/admin.html` (ใช้ Passcode ที่ตั้งใน `.env`)

---

## 💡 เรียนรู้เพิ่มเติม

* **การเทสระบบ (Testing):** เรามี Unit Tests ครอบคลุมการทำงานอย่างน้อยของ `Rooms` และ `Bookings` ศึกษาหน้าตาของ Unit Tests สำหรับแอปได้ที่คอลเลคชันในโฟลเดอร์ `backend/tests/` รันคำสั่งด้วย `npm test`
* **โครงสร้างอ้างอิงอื่นๆ:** ศึกษาแบบแปลนเอกสารรีวิวได้เพิ่มเติมแบบเจาะจงโฟลเดอร์ที่ `docs/PROJECT_STRUCTURE.md`
