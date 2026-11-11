# ตั้งค่าการส่งรายงาน ROV ไป Telegram

## ส่วนที่ต้องมี
- เว็บไซต์ ROV Stock Manager ที่เผยแพร่แล้ว
- Telegram Bot Token จาก @BotFather
- Telegram Chat ID ของแชตส่วนตัวหรือกลุ่ม
- Cloudflare account สำหรับติดตั้ง Worker

## 1. สร้าง Telegram Bot
1. เปิด Telegram แล้วค้นหา @BotFather
2. ส่งคำสั่ง /newbot และทำตามขั้นตอน
3. เก็บ Bot Token ไว้เป็นความลับ ห้ามส่งให้ผู้อื่นหรือใส่ในไฟล์เว็บไซต์
4. เปิดแชตกับบอตแล้วกด Start หรือเพิ่มบอตเข้ากลุ่ม Telegram ที่ต้องการรับรายงาน
5. ในกลุ่ม ให้ส่งข้อความ /start@ชื่อบอต เพื่อให้บอตเห็นกิจกรรมในแชต

## 2. หา Chat ID
1. ส่งข้อความถึงบอตหรือส่ง /start@ชื่อบอตในกลุ่ม
2. เปิด URL นี้ในเบราว์เซอร์ของตนเอง โดยแทน TOKEN ด้วย Bot Token:
   https://api.telegram.org/botTOKEN/getUpdates
3. หา `message.chat.id` ในผลลัพธ์ ตัวเลขนั้นคือ Chat ID
4. อย่าส่ง URL ที่มี Token ให้ผู้อื่น และอย่าวาง Token ในแชตนี้

## 3. ติดตั้ง Cloudflare Worker
1. เปิด Cloudflare Dashboard > Workers & Pages
2. เลือก Create > Worker แล้วตั้งชื่อ เช่น rov-telegram-report
3. เปิด Worker > Edit code
4. คัดลอกเนื้อหาไฟล์ `telegram-worker.js` ใน repository นี้ไปวาง แล้ว Deploy
5. เปิด Worker > Settings > Variables and Secrets และเพิ่ม:
   - Secret: `TELEGRAM_BOT_TOKEN` = Bot Token จาก BotFather
   - Variable: `TELEGRAM_CHAT_ID` = Chat ID ที่ได้
   - Variable: `ALLOWED_ORIGIN` = origin ของเว็บไซต์ เช่น `https://example.com` (ใส่เฉพาะ scheme และ domain ไม่ใส่ path หรือ / ท้าย)
6. Save และ Deploy อีกครั้งหลังเพิ่มค่าตัวแปร

## 4. เชื่อมเว็บไซต์
1. เปิดเว็บ ROV Stock Manager แล้วเข้าแท็บ “รายงานขาย”
2. เปิด “ตั้งค่าการส่งรายงาน Telegram”
3. ใส่ Worker URL ที่ Cloudflare แสดง เช่น `https://rov-telegram-report.<account>.workers.dev`
4. กด “บันทึกการตั้งค่า”
5. กด “ส่งข้อความทดสอบ” และตรวจสอบแชต Telegram

## 5. ทดสอบขาย
หลังข้อความทดสอบมาถึง ให้ทดลองขายไอดีทดสอบหนึ่งรายการ ระบบจะบันทึกรายงานในเว็บและส่งรายงานไป Telegram เมื่อมีการขายใหม่

## ความปลอดภัยและข้อจำกัด
- ห้ามใส่ Bot Token ลงใน HTML, JavaScript ฝั่งเว็บ, GitHub repository หรือแชต
- Worker ตรวจสอบ Origin ให้ตรงกับ `ALLOWED_ORIGIN` แต่ CORS ไม่ใช่ระบบยืนยันตัวตนสำหรับ API ที่เปิดให้เรียกจากเซิร์ฟเวอร์อื่นได้
- ประวัติรายงานในเว็บไซต์ยังเก็บใน Local Storage ของอุปกรณ์ ไม่ได้ซิงก์ข้ามอุปกรณ์
- หากตั้งค่า Telegram หลังจากมีรายการขายเก่าแล้ว ระบบจะส่งเฉพาะรายการขายใหม่ ไม่ส่งย้อนหลังอัตโนมัติ
