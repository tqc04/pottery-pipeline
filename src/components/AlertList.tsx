"use client";

interface AlertItem {
  id: number;
  type: string;
  message: string;
  severity: string;
  createdAt: string;
  order: { orderCode: string };
}

interface AlertListProps {
  alerts: AlertItem[];
  onResolve?: (id: number) => void;
}

const severityStyles: Record<string, string> = {
  critical: "border-l-red-500 bg-red-50",
  warning: "border-l-amber-500 bg-amber-50",
  info: "border-l-blue-500 bg-blue-50",
};

export default function AlertList({ alerts, onResolve }: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <p className="text-stone-500 text-sm py-4 text-center">
        Không có cảnh báo active
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`border-l-4 rounded-r-lg p-3 text-sm ${
            severityStyles[alert.severity] || severityStyles.info
          }`}
        >
          <div className="flex justify-between items-start gap-2">
            <p className="text-stone-700">{alert.message}</p>
            {onResolve && (
              <button
                onClick={() => onResolve(alert.id)}
                className="text-xs text-stone-500 hover:text-stone-800 shrink-0"
              >
                ✓ Đóng
              </button>
            )}
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {new Date(alert.createdAt).toLocaleString("vi-VN")}
          </p>
        </div>
      ))}
    </div>
  );
}
