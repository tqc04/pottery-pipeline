# 🏺 Pottery Pipeline — Hệ Thống Điều Phối & Giám Sát Quy Trình Xưởng Gốm

> **Đề 2**: AI phân tích đơn hàng gốm + Điều phối quy trình sản xuất đa bước + Cảnh báo Telegram + Dashboard Kanban

## Tính năng

- **Web UI**: Dashboard KPI, Kanban board 5 công đoạn, form tạo đơn
- **AI Parser**: Google Gemini 3.6 Flash bóc tách đơn hàng tiếng Việt tự nhiên
- **Automation Workflow**: Tự khởi tạo pipeline 5 stage, validate chuyển stage, cron SLA check
- **Telegram Alerts**: Thông báo đơn mới, chuyển stage, trễ hạn, stuck, hoàn thành

## Quy trình sản xuất (5 stages)

| # | Stage | SLA |
|---|-------|-----|
| 1 | Tiếp nhận | 4h |
| 2 | Tạo khuôn | 24h |
| 3 | Nung | 48h |
| 4 | Tráng men | 24h |
| 5 | Kiểm tra & Giao | 8h |

## Tech Stack (100% Free)

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
- MySQL 8.0+ (local hoặc [PlanetScale free](https://planetscale.com/) / [Railway free](https://railway.app/))
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

Trên Windows PowerShell, chạy các lệnh trên trong thư mục `pottery-pipeline`. Nếu project đã có sẵn trên máy, chỉ cần mở terminal tại thư mục này và chạy `npm install`.

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
- Seed 5 production stages
- Tạo 3 đơn hàng mẫu demo

### 5. Chạy development server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

## Cách sử dụng

### Dashboard `/`

Dashboard hiển thị:

- Số đơn đang sản xuất
- Số task đã quá SLA
- Số đơn hoàn thành trong ngày
- Lead time trung bình
- Danh sách cảnh báo chưa xử lý

Dashboard tự tải lại dữ liệu định kỳ. Cảnh báo có thể được đánh dấu đã xử lý trực tiếp trên giao diện.

### Tạo đơn `/orders/new`

1. Nhập mô tả đơn hàng bằng tiếng Việt tự nhiên, ví dụ: `50 ly sứ trắng men bóng, giao trong 7 ngày, gấp`.
2. Bấm **AI Preview** để xem sản phẩm, số lượng, loại men, deadline, ưu tiên và confidence.
3. Kiểm tra kết quả rồi bấm **Tạo đơn & Khởi tạo pipeline**.
4. Hệ thống lưu đơn, tạo 5 production task và đưa task đầu tiên vào trạng thái `in_progress`.

Nếu Gemini không được cấu hình hoặc trả về dữ liệu không hợp lệ, parser sẽ dùng regex fallback để vẫn tạo được đơn cơ bản.

### Kanban `/kanban`

Kanban gồm 5 cột theo thứ tự:

1. Tiếp nhận
2. Tạo khuôn
3. Nung
4. Tráng men
5. Kiểm tra & Giao

Mỗi card hiển thị mã đơn, số lượng, sản phẩm, deadline, mức ưu tiên và trạng thái trễ SLA. Nút **Hoàn thành stage** chỉ chuyển đơn sang stage kế tiếp; không cho phép nhảy stage.

### Chi tiết đơn `/orders/:id`

Trang chi tiết hiển thị thông tin đơn, stage hiện tại, timeline 5 task và nhật ký hoạt động. Khi hoàn thành stage cuối, đơn chuyển sang `completed`, ghi thời gian hoàn thành và đóng các cảnh báo đang mở.

### SLA và cảnh báo

Scheduler chạy mỗi 5 phút trong process Node.js và kiểm tra:

- Task đang thực hiện đã quá `dueAt` → cảnh báo `DELAYED`
- Deadline còn tối đa 24 giờ → cảnh báo `DEADLINE_SOON`
- Task không thay đổi quá 48 giờ → cảnh báo `STUCK`

Cảnh báo được lưu trong database, hiển thị trên Dashboard và gửi Telegram nếu Telegram đã cấu hình. Có thể chạy thủ công bằng API cron được bảo vệ bởi `CRON_SECRET`.

## Hướng dẫn lấy API keys (FREE)

### Google Gemini API

1. Truy cập [Google AI Studio](https://aistudio.google.com/apikey)
2. Đăng nhập Google → **Create API Key**
3. Copy key vào `GEMINI_API_KEY`

> Nếu không có key, hệ thống tự fallback sang regex parser — vẫn chạy được.

### Telegram Bot

1. Mở Telegram → tìm **@BotFather**
2. Gửi `/newbot` → đặt tên → lấy **Bot Token**
3. Gửi tin nhắn cho bot vừa tạo
4. Truy cập `https://api.telegram.org/bot<TOKEN>/getUpdates` → lấy **chat.id**
5. Điền vào `.env`

> Nếu không cấu hình Telegram, thông báo sẽ log ra console (mock mode).

## Demo Script (2–3 phút)

1. Mở **Dashboard** (`/`) để giới thiệu KPI và cảnh báo.
2. Vào **Tạo đơn** (`/orders/new`), nhập `50 ly sứ trắng men bóng, giao trong 7 ngày, gấp`.
3. Bấm **AI Preview**, cho thấy JSON đã được kiểm tra schema và các thông tin nghiệp vụ.
4. Bấm **Tạo đơn**, mở trang chi tiết để cho thấy 5 task, stage đầu tiên `in_progress` và activity log.
5. Vào **Kanban** (`/kanban`), bấm **Hoàn thành stage** hai lần để minh họa chuyển stage tuần tự.
6. Chỉ vào deadline/SLA trên card và Dashboard để giới thiệu cảnh báo; notification Telegram sẽ xuất hiện nếu đã cấu hình.

## API Endpoints

```
POST   /api/orders                 Tạo đơn hàng
GET    /api/orders                 Danh sách đơn
GET    /api/orders/:id             Chi tiết đơn
POST   /api/orders/:id/advance     Hoàn thành stage hiện tại và chuyển stage
POST   /api/orders/parse-preview   AI preview (không lưu)
GET    /api/kanban                 Dữ liệu Kanban board
GET    /api/alerts                 Cảnh báo active
GET    /api/dashboard/stats        KPI dashboard
POST   /api/cron/check-sla         Trigger SLA check thủ công (Bearer CRON_SECRET)
```

## Kiến trúc

```
[Quản đốc / Khách]
       │ Nhập prompt mô tả đơn
       ▼
[Next.js Web UI] ──POST /api/orders──► [Workflow Engine]
       ▲                                    │
       │ polling 8s                           ├─► [Gemini 3.6 Flash] AI parse
       │                                    ├─► [MySQL] orders, tasks, alerts
[Kanban + Dashboard] ◄─────────────────────┴─► [Telegram Bot] alerts
                                                    ▲
                                            [Cron 5 phút] SLA check
```

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

## Cấu trúc thư mục

```
pottery-pipeline/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
├── src/
│   ├── app/               # Pages + API routes
│   ├── components/        # React components
│   ├── lib/               # Business logic
│   │   ├── ai-parser.ts   # Gemini integration
│   │   ├── workflow.ts    # Pipeline engine
│   │   ├── telegram.ts    # Notifications
│   │   └── scheduler.ts   # Cron jobs
│   └── types/             # TypeScript types
├── BUILD_PROMPT.md        # Spec document
├── .env.example
└── README.md
```


