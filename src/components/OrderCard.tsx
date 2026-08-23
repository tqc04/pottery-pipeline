"use client";

import Link from "next/link";
import { KanbanTask, PRODUCT_LABELS } from "@/types";

interface OrderCardProps {
  task: KanbanTask;
  onAdvance: (orderId: number) => void;
  advancing?: boolean;
}

function isDelayed(dueAt: string | null): boolean {
  if (!dueAt) return false;
  return new Date(dueAt) < new Date();
}

function isDeadlineSoon(deadline: string): boolean {
  const diff = new Date(deadline).getTime() - Date.now();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
}

export default function OrderCard({ task, onAdvance, advancing }: OrderCardProps) {
  const { order } = task;
  const delayed = isDelayed(task.dueAt);
  const deadlineSoon = isDeadlineSoon(order.deadline);

  let borderColor = "border-stone-200";
  if (delayed) borderColor = "border-red-400 bg-red-50/50";
  else if (deadlineSoon) borderColor = "border-amber-400 bg-amber-50/50";
  else if (order.priority === "urgent") borderColor = "border-orange-400";

  return (
    <div className={`rounded-lg border-2 ${borderColor} bg-white p-3 shadow-sm`}>
      <div className="flex justify-between items-start mb-2">
        <Link
          href={`/orders/${order.id}`}
          className="font-bold text-amber-900 hover:underline"
        >
          {order.orderCode}
        </Link>
        {order.priority === "urgent" && (
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
            Gấp
          </span>
        )}
      </div>

      <p className="text-sm text-stone-700">
        {order.quantity} {PRODUCT_LABELS[order.productType] || order.productType}
      </p>
      {order.glazeType && (
        <p className="text-xs text-stone-500 mt-1">{order.glazeType}</p>
      )}

      <div className="mt-2 text-xs text-stone-500">
        ⏰ Giao: {new Date(order.deadline).toLocaleDateString("vi-VN")}
      </div>

      {delayed && (
        <p className="text-xs text-red-600 font-medium mt-1">🔴 Trễ SLA stage</p>
      )}

      <button
        onClick={() => onAdvance(order.id)}
        disabled={advancing}
        className="mt-3 w-full text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-1.5 rounded-md transition-colors"
      >
        {advancing ? "Đang xử lý..." : "Hoàn thành stage →"}
      </button>
    </div>
  );
}
