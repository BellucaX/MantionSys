# ใช้ Node.js version 20
FROM node:20-alpine

# กำหนดโฟลเดอร์ทำงานใน Container
WORKDIR /app

# คัดลอกไฟล์จัดการ Library
COPY package*.json ./

# ติดตั้ง Library (รวมถึง Prisma สำหรับ Prototype)
RUN npm install

# คัดลอกโค้ดทั้งหมดจากเครื่องเราลงไปใน Container
COPY . .

# เปิดพอร์ต 5000 ตามที่ระบุใน README
EXPOSE 5000

# สั่งรันโปรเจกต์ (อ้างอิงจาก server.js ที่เป็น entry point)
CMD ["node", "src/server.js"]