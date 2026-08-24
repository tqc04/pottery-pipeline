import { ParsedOrderSpecs } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const GEMINI_MODEL = "gemini-3.6-flash";
export const MAX_ORDER_QUANTITY = 10000;
export const MAX_DAILY_PRODUCTION = 1000;
const aiOrderSchema = z.object({
  product_type: z.enum(["ly_su", "dia", "bat", "binh", "am_tra", "khac"]),
  quantity: z.number().int().min(1).max(MAX_ORDER_QUANTITY),
  glaze_type: z.string().max(200),
  deadline_days: z.number().int().min(1).max(3650),
  priority: z.enum(["normal", "urgent"]),
  notes: z.string().max(500),
  confidence: z.number().min(0).max(1),
  height_cm: z.number().positive().max(1000).nullable().default(null),
  clay_amount_kg: z.number().positive().max(100000).nullable().default(null),
  firing_temperature_c: z.number().int().min(500).max(1600).nullable().default(null),
  firing_duration_hours: z.number().positive().max(168).nullable().default(null),
}).strict();

const SYSTEM_PROMPT = `Bạn là AI phân tích đơn hàng gốm sứ Việt Nam.
Trích xuất thông tin từ mô tả đơn hàng và trả về JSON thuần (không markdown).

Schema JSON:
{
  "product_type": "ly_su|dia|bat|binh|am_tra|khac",
  "quantity": number,
  "glaze_type": "string mô tả men/màu",
  "deadline_days": number,
  "priority": "normal|urgent",
  "notes": "string ghi chú thêm",
  "confidence": 0.0-1.0,
  "height_cm": number|null,
  "clay_amount_kg": number|null,
  "firing_temperature_c": number|null,
  "firing_duration_hours": number|null
}

Quy tắc:
- "gấp", "khẩn", "urgent" → priority: urgent
- Không có deadline → deadline_days: 14
- Số lượng mặc định: 1 nếu không nêu
- Trích xuất chiều cao theo cm, lượng đất sét theo kg, nhiệt độ nung theo độ C và thời gian nung theo giờ nếu có
- Không có thông số kỹ thuật thì dùng null, không tự bịa số liệu
- Chỉ nhận đơn tối đa ${MAX_ORDER_QUANTITY.toLocaleString("vi-VN")} sản phẩm
- Công suất tham chiếu là ${MAX_DAILY_PRODUCTION.toLocaleString("vi-VN")} sản phẩm/ngày
- product_type map: ly/cốc → ly_su, đĩa → dia, bát/tô → bat, bình/lọ → binh, ấm → am_tra`;

export function getOrderInputError(rawText: string): string | null {
  if (/(^|[^\d])-\s*\d+(?:[.,]\d+)?/.test(rawText)) {
    return "Số lượng và thời hạn phải là số dương";
  }

  if (!/(ly|cốc|đĩa|bát|tô|bình|lọ|ấm)\b/i.test(rawText)) {
    return "Không thể phân tích: sản phẩm chưa được hỗ trợ. Vui lòng nhập ly, đĩa, bát, bình hoặc ấm trà.";
  }

  return null;
}

export function getOrderFeasibilityError(parsed: ParsedOrderSpecs): string | null {
  if (parsed.product_type === "khac") {
    return "Không thể phân tích: sản phẩm chưa được hỗ trợ. Vui lòng nhập ly, đĩa, bát, bình hoặc ấm trà.";
  }

  const requiredDays = Math.max(1, Math.ceil(parsed.quantity / MAX_DAILY_PRODUCTION));
  if (parsed.quantity > MAX_ORDER_QUANTITY) {
    return `Đơn hàng vượt giới hạn ${MAX_ORDER_QUANTITY.toLocaleString("vi-VN")} sản phẩm/đơn. Với công suất tham chiếu ${MAX_DAILY_PRODUCTION.toLocaleString("vi-VN")} sản phẩm/ngày, số lượng ${parsed.quantity.toLocaleString("vi-VN")} cần tối thiểu ${requiredDays.toLocaleString("vi-VN")} ngày. Giải pháp: chia thành nhiều đơn/đợt hoặc liên hệ xưởng để xác nhận công suất riêng.`;
  }

  if (parsed.deadline_days < requiredDays) {
    return `Không thể hoàn thành trong ${parsed.deadline_days} ngày. Với số lượng ${parsed.quantity.toLocaleString("vi-VN")}, cần tối thiểu ${requiredDays} ngày. Vui lòng chọn deadline từ ${requiredDays} ngày.`;
  }

  return null;
}

function parseVietnameseNumber(value: string, scale?: string): number {
  const normalized = value.includes(".") && !value.includes(",")
    ? value.replace(/\./g, "")
    : value.replace(/\./g, "").replace(",", ".");
  const multiplier = scale === "tỷ" ? 1_000_000_000 : scale === "triệu" ? 1_000_000 : scale === "nghìn" || scale === "k" ? 1_000 : 1;
  return Math.round(Number(normalized) * multiplier);
}

function fallbackParse(rawText: string): ParsedOrderSpecs {
  const quantityMatch = rawText.match(/(\d+(?:[.,]\d+)?)\s*(tỷ|triệu|nghìn|k)?\s*(ly|cốc|đĩa|bát|bình|ấm|cái|chiếc|sp)/i);
  const quantity = quantityMatch
    ? parseVietnameseNumber(quantityMatch[1], quantityMatch[2]?.toLowerCase())
    : 1;

  const deadlineMatch = rawText.match(/(\d+)\s*ngày/);
  const deadline_days = deadlineMatch ? parseInt(deadlineMatch[1], 10) : 14;

  const isUrgent = /gấp|khẩn|urgent/i.test(rawText);
  const readNumber = (pattern: RegExp): number | null => {
    const match = rawText.match(pattern);
    return match ? Number(match[1].replace(",", ".")) : null;
  };

  let product_type = "khac";
  if (/ly|cốc/i.test(rawText)) product_type = "ly_su";
  else if (/đĩa/i.test(rawText)) product_type = "dia";
  else if (/bát|tô/i.test(rawText)) product_type = "bat";
  else if (/bình|lọ/i.test(rawText)) product_type = "binh";
  else if (/ấm/i.test(rawText)) product_type = "am_tra";

  return {
    product_type,
    quantity,
    glaze_type: rawText.includes("men") ? "men bóng" : "men mặc định",
    deadline_days,
    priority: isUrgent ? "urgent" : "normal",
    notes: rawText.slice(0, 200),
    confidence: 0.5,
    height_cm: readNumber(/(?:cao|chiều cao)\s*(\d+(?:[.,]\d+)?)\s*cm/i),
    clay_amount_kg: readNumber(/(?:đất sét|đất)[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*kg/i) ?? readNumber(/(\d+(?:[.,]\d+)?)\s*kg\s*(?:đất sét|đất)/i),
    firing_temperature_c: readNumber(/(\d{3,4})\s*°?\s*c/i),
    firing_duration_hours: readNumber(/nung[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*(?:giờ|h)/i),
  };
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function estimateTechnicalSpecs(parsed: ParsedOrderSpecs): ParsedOrderSpecs {
  const clayPerPiece: Record<string, number> = {
    ly_su: 0.35,
    dia: 0.5,
    bat: 0.45,
    binh: 1.2,
    am_tra: 1,
    khac: 0.6,
  };
  const heightFactor = parsed.height_cm
    ? Math.min(2.5, Math.max(0.7, parsed.height_cm / 20))
    : 1;
  const estimatedClay = roundToTenth(parsed.quantity * (clayPerPiece[parsed.product_type] ?? 0.6) * heightFactor);
  const estimatedDuration = Math.min(24, 8 + Math.ceil(parsed.quantity / 100) * 2);

  return {
    ...parsed,
    clay_amount_kg: parsed.clay_amount_kg ?? estimatedClay,
    firing_temperature_c: parsed.firing_temperature_c ?? 1280,
    firing_duration_hours: parsed.firing_duration_hours ?? estimatedDuration,
  };
}

function extractJson(text: string): ParsedOrderSpecs {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = aiOrderSchema.parse(JSON.parse(cleaned));

  return {
    product_type: parsed.product_type,
    quantity: parsed.quantity,
    glaze_type: parsed.glaze_type,
    deadline_days: parsed.deadline_days,
    priority: parsed.priority,
    notes: parsed.notes,
    confidence: parsed.confidence,
    height_cm: parsed.height_cm,
    clay_amount_kg: parsed.clay_amount_kg,
    firing_temperature_c: parsed.firing_temperature_c,
    firing_duration_hours: parsed.firing_duration_hours,
  };
}

export async function parseOrderText(rawText: string): Promise<ParsedOrderSpecs> {
  const inputError = getOrderInputError(rawText);
  if (inputError) throw new Error(inputError);

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return estimateTechnicalSpecs(fallbackParse(rawText));
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(
      `${SYSTEM_PROMPT}\n\nMô tả đơn hàng:\n"${rawText}"`
    );
    const text = result.response.text();
    return estimateTechnicalSpecs(extractJson(text));
  } catch {
    return estimateTechnicalSpecs(fallbackParse(rawText));
  }
}
