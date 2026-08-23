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
  "confidence": 0.0-1.0
}

Quy tắc:
- "gấp", "khẩn", "urgent" → priority: urgent
- Không có deadline → deadline_days: 14
- Số lượng mặc định: 1 nếu không nêu
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
  };
}

export async function parseOrderText(rawText: string): Promise<ParsedOrderSpecs> {
  const inputError = getOrderInputError(rawText);
  if (inputError) throw new Error(inputError);

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return fallbackParse(rawText);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(
      `${SYSTEM_PROMPT}\n\nMô tả đơn hàng:\n"${rawText}"`
    );
    const text = result.response.text();
    return extractJson(text);
  } catch {
    return fallbackParse(rawText);
  }
}
