import type { AlertSeverity, AlertType } from "@/types/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function notifyTelegram(
  message: string,
  severity: AlertSeverity = "info"
): Promise<void> {
  const prefix =
    severity === "critical" ? "🚨" : severity === "warning" ? "⚠️" : "ℹ️";
  await sendTelegramMessage(`${prefix} ${message}`);
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

export function alertTypeToSeverity(type: AlertType): AlertSeverity {
  switch (type) {
    case "DELAYED":
    case "DEADLINE_SOON":
      return "warning";
    case "STUCK":
      return "critical";
    default:
      return "info";
  }
}

export function calcLeadTimeDays(createdAt: Date, completedAt: Date): string {
  const diffMs = completedAt.getTime() - createdAt.getTime();
  return (diffMs / (1000 * 60 * 60 * 24)).toFixed(1);
}
