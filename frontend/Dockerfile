# ใช้ Nginx เป็น Web Server สำหรับไฟล์ Static (HTML/JS/CSS)
FROM nginx:alpine

# คัดลอกไฟล์หน้าเว็บทั้งหมดไปที่โฟลเดอร์ของ Nginx
COPY . /usr/share/nginx/html

# Nginx รันที่พอร์ต 80 เป็นค่าเริ่มต้น
EXPOSE 80