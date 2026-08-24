import type { AlertSeverity, AlertType } from "@/types/prisma";
import { sendTelegramMessage, type TelegramReplyMarkup } from "@/lib/telegram";

export function completeStageKeyboard(orderId: number): TelegramReplyMarkup {
  return {
    inline_keyboard: [[{ text: "✅ Xác nhận hoàn thành công đoạn", callback_data: `complete_stage:${orderId}` }]],
  };
}

export async function notifyTelegram(
  message: string,
  severity: AlertSeverity = "info",
  actionableOrderId?: number,
  targetChatId?: string
): Promise<void> {
  const prefix =
    severity === "critical" ? "🚨" : severity === "warning" ? "⚠️" : "ℹ️";
  await sendTelegramMessage(`${prefix} ${message}`, actionableOrderId ? completeStageKeyboard(actionableOrderId) : undefined, targetChatId);
}

export function formatDeadline(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatProductType(type: string): string {
  const labels: Record<string, string> = {
    ly_su: "ly sứ",
    dia: "đĩa",
    bat: "bát",
    binh: "bình",
    am_tra: "ấm trà",
    khac: "sản phẩm",
  };
  return labels[type] || type;
}

export function formatFiringSpecs(order: {
  firingTemperatureC: number | null;
  firingDurationHours: number | null;
}): string {
  const specs = [
    order.firingTemperatureC ? `nung ${order.firingTemperatureC}°C` : null,
    order.firingDurationHours ? `${order.firingDurationHours} giờ` : null,
  ].filter(Boolean);
  return specs.length > 0 ? ` — ${specs.join(", ")}` : "";
}

export function alertTypeToSeverity(type: AlertType): AlertSeverity {
  switch (type) {
    case "DELAYED":
    case "DEADLINE_SOON":
      return "warning";
    case "STUCK":
      return "critical";
    case "QC_ISSUE":
      return "critical";
    default:
      return "info";
  }
}

export function calcLeadTimeDays(createdAt: Date, completedAt: Date): string {
  const diffMs = completedAt.getTime() - createdAt.getTime();
  return (diffMs / (1000 * 60 * 60 * 24)).toFixed(1);
}
