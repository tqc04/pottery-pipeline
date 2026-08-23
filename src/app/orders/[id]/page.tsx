"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PRODUCT_LABELS } from "@/types";

interface OrderDetail {
  id: number;
  orderCode: string;
  rawInput: string | null;
  quantity: number;
  productType: string;
  glazeType: string | null;
  deadline: string;
  priority: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  currentStage: { name: string; slug: string } | null;
  tasks: Array<{
    id: number;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    dueAt: string | null;
    stage: { name: string; sequence: number };
  }>;
  activityLogs: Array<{
    id: number;
    eventType: string;
    payload: unknown;
    createdAt: string;
  }>;
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`);
    if (res.ok) setOrder(await res.json());
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      const res = await fetch(`/api/orders/${id}/advance`, { method: "POST" });
      if (res.ok) fetchOrder();
      else {
        const err = await res.json();
        alert(err.error);
      }
    } finally {
      setAdvancing(false);
    }
  };

  if (!order) {
    return <p className="text-stone-500 text-center py-20">Đang tải...</p>;
  }

  const statusLabel: Record<string, string> = {
    active: "Đang sản xuất",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/kanban" className="text-stone-500 hover:text-stone-800 text-sm">
          ← Kanban
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{order.orderCode}</h1>
            <p className="text-stone-500 text-sm mt-1">{order.rawInput}</p>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              order.status === "completed"
                ? "bg-green-100 text-green-700"
                : order.status === "active"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-stone-100 text-stone-600"
            }`}
          >
            {statusLabel[order.status]}
          </span>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-sm">
          <div>
            <dt className="text-stone-500">Sản phẩm</dt>
            <dd className="font-medium">
              {order.quantity} {PRODUCT_LABELS[order.productType] || order.productType}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Men</dt>
            <dd className="font-medium">{order.glazeType || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Deadline</dt>
            <dd className="font-medium">
              {new Date(order.deadline).toLocaleDateString("vi-VN")}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Ưu tiên</dt>
            <dd className="font-medium">
              {order.priority === "urgent" ? "🔥 Gấp" : "Bình thường"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Stage hiện tại</dt>
            <dd className="font-medium">{order.currentStage?.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Tạo lúc</dt>
            <dd className="font-medium">
              {new Date(order.createdAt).toLocaleString("vi-VN")}
            </dd>
          </div>
        </dl>

        {order.status === "active" && (
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className="mt-6 px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            {advancing ? "Đang xử lý..." : "Hoàn thành stage hiện tại →"}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-semibold mb-4">Timeline sản xuất</h2>
        <div className="space-y-3">
          {order.tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 text-sm">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${
                  task.status === "completed"
                    ? "bg-green-500"
                    : task.status === "in_progress"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-stone-300"
                }`}
              />
              <span className="font-medium w-32">{task.stage.name}</span>
              <span className="text-stone-500 text-xs">
                {task.status === "completed" && task.completedAt
                  ? `✓ ${new Date(task.completedAt).toLocaleString("vi-VN")}`
                  : task.status === "in_progress"
                    ? "Đang thực hiện"
                    : "Chờ"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {order.activityLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Nhật ký hoạt động</h2>
          <div className="space-y-2">
            {order.activityLogs.map((log) => (
              <div key={log.id} className="text-sm flex justify-between">
                <span className="text-stone-700">{log.eventType}</span>
                <span className="text-stone-400 text-xs">
                  {new Date(log.createdAt).toLocaleString("vi-VN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
