# 🏺 Pottery Pipeline — Hệ Thống Điều Phối & Giám Sát Quy Trình Xưởng Gốm

> **Đề 2**: AI phân tích đơn hàng gốm + Điều phối quy trình sản xuất đa bước + Cảnh báo Telegram + Dashboard Kanban

## Tính năng

- **Web UI**: Dashboard KPI, Kanban board 6 công đoạn, form tạo đơn và màn hình QC
- **AI Parser**: Google Gemini 3.6 Flash bóc tách đơn hàng tiếng Việt tự nhiên
- **Automation Workflow**: Tự khởi tạo pipeline 6 stage, validate chuyển stage, cron SLA check
- **QC**: Ghi nhận số lượng kiểm tra, sản phẩm lỗi, nguyên nhân và trạng thái đạt/làm lại/không đạt
- **Telegram Alerts**: Thông báo đơn mới, chuyển stage, trễ hạn, stuck, hoàn thành

## Quy trình sản xuất (6 stages)

| # | Stage | SLA |
|---|-------|-----|
| 1 | Tạo hình mộc | 24h |
| 2 | Phơi sấy & Sửa mộc | 24h |
| 3 | Vẽ họa tiết | 24h |
| 4 | Tráng men | 24h |
| 5 | Nung lò | 48h |
| 6 | QC & Đóng gói | 8h |

## Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Frontend + API | Next.js 14, TypeScript, Tailwind CSS |
| Database | MySQL |
| ORM | Prisma |
| AI | Google Gemini 3.6 Flash |
| Notification | Telegram Bot API |
| Scheduler | node-cron (mỗi 5 phút) |

## Yêu cầu hệ thống

- Node.js 18+
- MySQL 8.0+ (local hoặc dịch vụ MySQL tương thích)
- npm 9+
- Tài khoản Gemini API là tùy chọn; không có key hệ thống sẽ dùng regex fallback
- Telegram Bot là tùy chọn; không cấu hình sẽ ghi notification ra console

## Cài đặt

### 1. Clone & cài dependencies

```bash
git clone <repo-url>
cd pottery-pipeline
npm install
```

### 2. Tạo database MySQL

```sql
CREATE DATABASE pottery_pipeline CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Cấu hình environment

```bash
cp .env.example .env
```

Trên Windows PowerShell, có thể dùng:

```powershell
Copy-Item .env.example .env
```

Nếu chỉ cần chạy bản demo local, có thể tạo `.env` với tài khoản demo bằng PowerShell:

```powershell
Copy-Item .env.example .env
(Get-Content .env) -replace '^ADMIN_EMAIL=.*', 'ADMIN_EMAIL=admin@pottery.local' -replace '^ADMIN_PASSWORD=.*', 'ADMIN_PASSWORD=admin123' -replace '^USER_EMAIL=.*', 'USER_EMAIL=user@pottery.local' -replace '^USER_PASSWORD=.*', 'USER_PASSWORD=user123' | Set-Content .env
```

Chỉnh `.env`:

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/pottery_pipeline"
GEMINI_API_KEY=xxx          # https://aistudio.google.com/apikey (FREE)
TELEGRAM_BOT_TOKEN=xxx      # @BotFather trên Telegram (FREE)
TELEGRAM_CHAT_ID=xxx        # Chat ID nhận thông báo
CRON_SECRET=random-string # bắt buộc cho endpoint cron
```

### 4. Setup database & seed data

```bash
npm run db:setup
```

Lệnh này sẽ:
- Tạo tables trong MySQL
- Seed 6 production stages
- Tạo 3 đơn hàng mẫu demo

### 5. Chạy development server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

## Cách sử dụng

### Role demo

Ứng dụng có màn hình đăng nhập cho `User` và `Admin`. User có thể xem dashboard, tạo đơn, chuyển công đoạn và nhập QC. Admin có thêm quyền chỉnh deadline/ưu tiên và đóng cảnh báo.

Tài khoản demo mặc định:

| Role | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@pottery.local` | `admin123` |
| User | `user@pottery.local` | `user123` |

Mở `http://localhost:3000/login` để đăng nhập.

Lệnh cập nhật code cho bản clone sẵn có:

```powershell
Set-Location pottery-pipeline
git pull
npm install
npm run db:setup
npm run dev
```

Đây là authentication tối giản phục vụ demo. Không dùng credential demo trên production.

### Dashboard `/`

Hiển thị KPI, đơn đang sản xuất và cảnh báo chưa xử lý.

### Tạo đơn `/orders/new`

1. Nhập mô tả đơn hàng bằng tiếng Việt tự nhiên, ví dụ: `50 ly sứ trắng men bóng, giao trong 7 ngày, gấp`.
2. Bấm **AI Preview** để xem sản phẩm, số lượng, loại men, kích thước, lượng đất, nhiệt độ/thời gian nung, deadline, ưu tiên và confidence.
3. Kiểm tra kết quả rồi bấm **Tạo đơn & Khởi tạo pipeline**.
4. Hệ thống lưu đơn, tạo 6 production task và đưa task đầu tiên vào trạng thái `in_progress`.

Nếu Gemini không được cấu hình hoặc trả về dữ liệu không hợp lệ, parser sẽ dùng regex fallback để vẫn tạo được đơn cơ bản.

### Kanban `/kanban`

Kanban gồm 6 cột theo thứ tự:

1. Tạo hình mộc
2. Phơi sấy & Sửa mộc
3. Vẽ họa tiết
4. Tráng men
5. Nung lò
6. QC & Đóng gói

Mỗi card hiển thị mã đơn, số lượng, sản phẩm, deadline, mức ưu tiên và trạng thái trễ SLA. Nút **Hoàn thành stage** chỉ chuyển đơn sang stage kế tiếp; không cho phép nhảy stage.

Tại stage **QC & Đóng gói**, nhập số lượng đã kiểm, số lượng lỗi, loại lỗi và kết quả. Đơn chỉ được hoàn thành khi kết quả QC là **Đạt**. Nếu có lỗi, hệ thống tạo cảnh báo critical và gửi Telegram.

### Chi tiết đơn `/orders/:id`

Trang chi tiết hiển thị thông tin đơn, stage hiện tại, timeline 6 task và nhật ký hoạt động. Chỉ kết quả QC **Đạt** mới cho phép hoàn tất đơn.

### SLA và cảnh báo

Scheduler chạy mỗi 5 phút trong process Node.js và kiểm tra:

- Task đang thực hiện đã quá `dueAt` → cảnh báo `DELAYED`
- Deadline còn tối đa 24 giờ → cảnh báo `DEADLINE_SOON`
- Task không thay đổi quá 48 giờ → cảnh báo `STUCK`

Cảnh báo được lưu trong database, hiển thị trên Dashboard và gửi Telegram nếu Telegram đã cấu hình. Có thể chạy thủ công bằng API cron được bảo vệ bởi `CRON_SECRET`.

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run db:push      # Sync schema → MySQL
npm run db:seed      # Seed stages + sample orders
npm run db:setup     # push + seed
```

## Xử lý lỗi thường gặp

- **Không kết nối được database:** kiểm tra MySQL đang chạy và `DATABASE_URL` có đúng user, password, port, database name.
- **Không có stage trên Kanban:** chạy lại `npm run db:seed` hoặc `npm run db:setup`.
- **Không có Telegram:** kiểm tra `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID`; nếu bỏ trống, xem mock notification trong terminal.
- **AI không gọi được:** kiểm tra `GEMINI_API_KEY`; hệ thống vẫn dùng fallback parser khi Gemini lỗi.
- **Cron trả về 401:** gửi header `Authorization: Bearer <CRON_SECRET>` khi gọi endpoint.


