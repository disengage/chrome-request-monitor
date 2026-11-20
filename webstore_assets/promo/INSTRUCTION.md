# Store screenshots

หน้าในโฟลเดอร์นี้คือต้นแบบรูป Chrome Web Store ไม่ได้เป็นส่วนหนึ่งของ extension ที่รันจริง แก้ HTML แล้วถ่ายรูปใหม่ทุกครั้งที่หน้า popup เปลี่ยน

รันเว็บจากรากของ repo เท่านั้น ถ้าเปิดจากใน `promo/` path ของ CSS และไอคอนจะชี้ผิด แล้ว popup ในรูปจะไม่มีสไตล์

```bash
python3 -m http.server 8766
```

## ไฟล์

| ไฟล์ | ทำอะไร |
| --- | --- |
| `index.html` | สไลด์คำโปรย 1280×800 แต่ละสไลด์มีข้อความซ้ายและ popup ขวา |
| `shot.css` | เลย์เอาต์ของสไลด์ ขนาดป๊อปอัปถูกขยายด้วย `--popup-scale` |
| `frame.html` | popup จำลอง 420×600 ใช้ `popup/popup.css` ของจริง |
| `tile.html` | ไทล์เล็ก 440×280 |
| `screenshots/` | รูปที่ถ่ายแล้ว ใช้อัปโหลดขึ้นสโตร์ |

เปิดทีละสไลด์ด้วย `?slide=`

- `http://127.0.0.1:8766/webstore_assets/promo/index.html?slide=1` → `screenshots/01-capture.png`
- `?slide=2` → `screenshots/02-quick-filters.png`
- `?slide=3` → `screenshots/03-filter.png`
- `?slide=4` → `screenshots/04-by-domain.png`
- `?slide=5` → `screenshots/05-detail.png`
- `tile.html` → `screenshots/small-promo-tile.png`

สโตร์รับสกรีนช็อตได้ 5 รูป ที่ 1280×800 และไทล์เล็กที่ 440×280 ถ่ายให้ได้ขนาดนี้พอดี

## เขียน popup ในรูป

`frame.html` เลือกหน้าที่โชว์จาก `?view=` แล้วใส่ค่าลง `document.documentElement.dataset.view` มุมมองที่ซ่อนอยู่ยังอยู่ใน DOM แต่มองไม่เห็น

มุมมองที่มีอยู่: `list`, `filter`, `domains`, `domain`, `api`, `detail`

เพิ่มสถานะใหม่ของ popup แบบนี้

1. คัดลอกโครงจาก `popup/popup.html` มาเป็น `<div class="view view-ชื่อ">` ใน `frame.html` ใช้ class เดิมของ popup อย่าเขียนสไตล์ปุ่มหรือรายการซ้ำ
2. ใส่ข้อมูลตัวอย่างไว้ใน HTML โดยตรง ไม่ต้องต่อ `popup.js` หรือ `chrome.*`
3. เพิ่มตัวเลือกใน CSS ด้านบนของ `frame.html` ให้ `html[data-view="ชื่อ"] .view-ชื่อ` เป็น `display: block`
4. ใน `index.html` ชี้ iframe ไปที่ `frame.html?view=ชื่อ`

Path ที่ใช้ได้เมื่อเสิร์ฟจากราก repo

- CSS ของ popup: `../../popup/popup.css`
- ไอคอน: `../../icons/icon32.png`
- favicon ของโดเมนในรายการ By Domain โหลดจาก Google ตอนถ่ายรูปต้องต่อเน็ต

## เขียนคำโปรย

แต่ละสไลด์ใน `index.html` เป็น `<section class="slide" id="sN">` สคริปต์ท้ายไฟล์อ่าน `?slide=` แล้วใส่ class `on` ให้สไลด์นั้นสไลด์เดียว

โครงซ้ายไปขวาคือบรรทัดแบรนด์, ข้อความ (`eyebrow`, `h1`, `lede`, รายการ `points` หรือ `legend`), แล้ว iframe ใน `.clip` ข้อความกับสิ่งที่เห็นใน popup ต้องตรงกับพฤติกรรมปัจจุบัน

## ถ่ายรูป

ตั้ง viewport ให้เท่าขนาดของหน้านั้น แล้วเซฟ PNG ทับไฟล์ใน `screenshots/`

- สไลด์: กว้าง 1280 สูง 800 ที่ scale 1
- ไทล์: กว้าง 440 สูง 280 ที่ scale 1

ก่อนเซฟ ดูว่า popup มีสี method badge, ไอคอนมุมซ้ายขึ้น, และสไลด์ By Domain มี favicon ครบ ถ้า badge เป็นข้อความล้วน แสดงว่า `popup.css` โหลดไม่ผ่าน
