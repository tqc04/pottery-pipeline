# BUILD PROMPT — Hệ Thống Điều Phối & Giám Sát Quy Trình Xưởng Gốm

> Prompt chuẩn dùng để build project. Mọi implementation phải tuân thủ spec này.

## Mục tiêu

Xây dựng hệ thống quản lý pipeline sản xuất gốm sứ với:
- **Web UI**: Kanban dashboard + form tạo đơn + KPI
- **Automation Workflow**: Tự tạo pipeline 6 stage, validate chuyển stage, cron cảnh báo SLA
- **AI**: Google Gemini 3.6 Flash parse đơn hàng tiếng Việt tự nhiên
- **Chat Notification**: Telegram Bot (free) bắn alert

## Tech Stack (100% Free)

| Layer | Công nghệ |
|---|---|
| Frontend + API | Next.js 14 App Router (TypeScript) |
| Database | MySQL (local hoặc PlanetScale free / Railway free) |
| ORM | Prisma |
| AI | Google Gemini 3.6 Flash |
| Notification | Telegram Bot API |
| Scheduler | node-cron trong Next.js instrumentation |
| Styling | Tailwind CSS |

## Database Schema (MySQL via Prisma)

### ProductionStage (seed 6 rows cố định)
- id, name, slug, sequence, slaHours

Stages:
1. tao_hinh_moc (Tạo hình mộc, SLA 24h)
2. phoi_say_sua_moc (Phơi sấy & Sửa mộc, SLA 24h)
3. ve_hoa_tiet (Vẽ họa tiết, SLA 24h)
4. trang_men (Tráng men, SLA 24h)
5. nung_lo (Nung lò, SLA 48h)
6. qc_dong_goi (QC & Đóng gói, SLA 8h)

### Order
- id, orderCode (ORD-001), rawInput, parsedSpecs (JSON)
- quantity, productType, glazeType, deadline, priority (normal|urgent)
- status (active|completed|cancelled), currentStageId
- createdAt, updatedAt, completedAt
- heightCm, clayAmountKg, firingTemperatureC, firingDurationHours

### ProductionTask
- id, orderId, stageId, status (pending|in_progress|completed)
- startedAt, completedAt, dueAt

### Alert
- id, orderId, type (DELAYED|DEADLINE_SOON|STUCK|ORDER_CREATED|STAGE_CHANGED|ORDER_COMPLETED|QC_ISSUE)
- message, severity (info|warning|critical), isResolved, createdAt

### ActivityLog
- id, orderId, eventType, payload (JSON), createdAt

### QcInspection
- orderId, inspectedQuantity, defectQuantity, defectType, notes, result, createdAt

## API Endpoints

```
POST   /api/orders              — Tạo đơn (rawText hoặc structured)
GET    /api/orders              — List orders (filter status)
GET    /api/orders/[id]         — Chi tiết + tasks + logs
PATCH  /api/orders/[id]         — Update priority/deadline

GET    /api/kanban              — Tasks grouped by stage
POST   /api/orders/[id]/advance — Complete current stage and move forward
POST   /api/orders/[id]/qc — Ghi nhận kết quả QC và cảnh báo lỗi

GET    /api/alerts              — Active alerts
PATCH  /api/alerts/[id]/resolve — Resolve alert

GET    /api/dashboard/stats     — KPI stats
POST   /api/orders/parse-preview — AI preview không lưu DB
POST   /api/cron/check-sla      — Manual trigger SLA check (dev)
```

## Workflow Rules

1. **Order created** → AI parse → INSERT order → CREATE 6 tasks (stage 1 = in_progress, rest = pending) → Telegram notify → log
2. **Move stage** → Validate: không nhảy stage, stage trước phải completed → update tasks → Telegram → log
3. **Complete stage 6** → yêu cầu QC đạt → order.status = completed → Telegram success → log
4. **Cron every 5 min**:
   - Task in_progress quá dueAt → Alert DELAYED → Telegram
   - Order deadline còn 24h → Alert DEADLINE_SOON → Telegram
   - Task in_progress không đổi > 48h → Alert STUCK → Telegram

## AI Parser (Gemini 3.6 Flash)

System prompt parse JSON:
```json
{
  "product_type": "ly_su|dia|bat|binh|am_tra|khac",
  "quantity": number,
  "glaze_type": "string",
  "deadline_days": number,
  "priority": "normal|urgent",
  "notes": "string",
  "confidence": 0.0-1.0,
  "height_cm": number|null,
  "clay_amount_kg": number|null,
  "firing_temperature_c": number|null,
  "firing_duration_hours": number|null
}
```

Fallback: regex extract số lượng nếu AI fail.

## Telegram Events

| Event | Template |
|---|---|
| ORDER_CREATED | 🆕 Đơn #{code}: {qty} {product}, giao {deadline} |
| STAGE_CHANGED | ➡️ #{code}: {from} → {to} |
| DELAYED | ⚠️ #{code} trễ SLA stage {stage} |
| DEADLINE_SOON | ⏰ #{code} còn 24h deadline |
| STUCK | 🚨 #{code} stuck tại {stage} |
| ORDER_COMPLETED | ✅ #{code} hoàn thành — {days} ngày |

## UI Pages

1. `/` — Dashboard KPI (stats + recent alerts)
2. `/kanban` — Kanban board 6 cột, button move
3. `/orders/new` — Textarea prompt + AI preview + submit
4. `/orders/[id]` — Chi tiết đơn + timeline

## Env Variables

```
DATABASE_URL=mysql://user:pass@localhost:3306/pottery_pipeline
GEMINI_API_KEY=xxx
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx
CRON_SECRET=random-string-for-manual-trigger
TELEGRAM_WEBHOOK_SECRET=random-string-for-telegram-webhook
```

## File Structure

```
pottery-pipeline/
├── prisma/schema.prisma
├── prisma/seed.ts
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Dashboard
│   │   ├── kanban/page.tsx
│   │   ├── orders/new/page.tsx
│   │   ├── orders/[id]/page.tsx
│   │   ├── layout.tsx
│   │   └── api/...
│   ├── components/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   ├── OrderCard.tsx
│   │   ├── StatsCards.tsx
│   │   ├── AlertList.tsx
│   │   └── Navbar.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── ai-parser.ts
│   │   ├── workflow.ts
│   │   ├── telegram.ts
│   │   └── scheduler.ts
│   └── types/index.ts
├── .env.example
├── README.md
└── package.json
```

## Demo Script

1. Nhập "200 bình gốm họa tiết sen men lam cao 35cm, đất sét 80kg, nung 1280°C trong 12 giờ, hoàn thành trong 10 ngày" → AI parse → card Kanban
2. Chuyển stage → Telegram notification
3. Dashboard hiện KPI
4. Cron phát hiện trễ → alert UI + Telegram
5. Chuyển đến QC, nhập sản phẩm lỗi → cảnh báo critical + Telegram; sửa kết quả thành đạt rồi hoàn tất đơn
