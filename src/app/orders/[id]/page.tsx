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
  heightCm: number | null;
  clayAmountKg: number | null;
  firingTemperatureC: number | null;
  firingDurationHours: number | null;
  currentStage: { name: string; slug: string } | null;
  qcInspection: {
    inspectedQuantity: number;
    defectQuantity: number;
    defectType: string | null;
    notes: string | null;
    result: string;
    createdAt: string;
  } | null;
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
  const [qcSubmitting, setQcSubmitting] = useState(false);
  const [qcInspected, setQcInspected] = useState("");
  const [qcDefects, setQcDefects] = useState("0");
  const [qcResult, setQcResult] = useState<"passed" | "failed" | "rework">("passed");
  const [qcDefectType, setQcDefectType] = useState("");
  const [qcNotes, setQcNotes] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`);
    if (res.ok) setOrder(await res.json());
  }, [id]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((session) => setIsAdmin(session?.role === "admin"));
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

  const handleQcSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQcSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${id}/qc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspectedQuantity: Number(qcInspected),
          defectQuantity: Number(qcDefects),
          result: qcResult,
          defectType: qcDefectType,
          notes: qcNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Không thể lưu kết quả QC");
        return;
      }
      await fetchOrder();
    } finally {
      setQcSubmitting(false);
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

        <div className="mt-6 border-t border-stone-100 pt-5">
          <h2 className="font-semibold text-stone-800 mb-3">Thông số kỹ thuật</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><dt className="text-stone-500">Chiều cao</dt><dd className="font-medium">{order.heightCm ? `${order.heightCm} cm` : "Chưa xác định"}</dd></div>
            <div><dt className="text-stone-500">Đất sét</dt><dd className="font-medium">{order.clayAmountKg ? `${order.clayAmountKg} kg` : "Chưa xác định"}</dd></div>
            <div><dt className="text-stone-500">Nhiệt độ nung</dt><dd className="font-medium">{order.firingTemperatureC ? `${order.firingTemperatureC} °C` : "Chưa xác định"}</dd></div>
            <div><dt className="text-stone-500">Thời gian nung</dt><dd className="font-medium">{order.firingDurationHours ? `${order.firingDurationHours} giờ` : "Chưa xác định"}</dd></div>
          </dl>
        </div>

        {isAdmin && order.status === "active" && (
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className="mt-6 px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            {advancing ? "Đang xử lý..." : "Hoàn thành stage hiện tại →"}
          </button>
        )}
      </div>

      {order.qcInspection && (
        <div className={`rounded-xl border p-6 shadow-sm ${order.qcInspection.defectQuantity > 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
          <h2 className="font-semibold text-stone-900 mb-3">Kết quả QC</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-stone-500">Đã kiểm</p><p className="font-semibold">{order.qcInspection.inspectedQuantity}</p></div>
            <div><p className="text-stone-500">Sản phẩm lỗi</p><p className="font-semibold">{order.qcInspection.defectQuantity}</p></div>
            <div><p className="text-stone-500">Kết quả</p><p className="font-semibold">{order.qcInspection.result === "passed" ? "Đạt" : order.qcInspection.result === "rework" ? "Cần làm lại" : "Không đạt"}</p></div>
            <div><p className="text-stone-500">Loại lỗi</p><p className="font-semibold">{order.qcInspection.defectType || "Không có"}</p></div>
          </div>
          {order.qcInspection.notes && <p className="text-sm text-stone-600 mt-3">Ghi chú: {order.qcInspection.notes}</p>}
        </div>
      )}

      {isAdmin && order.status === "active" && order.currentStage?.slug === "qc_dong_goi" && (
        <form onSubmit={handleQcSubmit} className="bg-white rounded-xl border border-red-200 p-6 shadow-sm space-y-4">
          <div>
            <h2 className="font-semibold text-stone-900">Kiểm định chất lượng & đóng gói</h2>
            <p className="text-sm text-stone-500 mt-1">Ghi nhận kết quả QC trước khi hoàn thành stage cuối.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="text-sm text-stone-700">Số lượng kiểm tra<input required min="1" type="number" value={qcInspected} onChange={(event) => setQcInspected(event.target.value)} className="mt-1 w-full border border-stone-300 rounded-lg p-2" /></label>
            <label className="text-sm text-stone-700">Số lượng lỗi<input required min="0" type="number" value={qcDefects} onChange={(event) => setQcDefects(event.target.value)} className="mt-1 w-full border border-stone-300 rounded-lg p-2" /></label>
            <label className="text-sm text-stone-700">Kết quả<select value={qcResult} onChange={(event) => setQcResult(event.target.value as typeof qcResult)} className="mt-1 w-full border border-stone-300 rounded-lg p-2"><option value="passed">Đạt</option><option value="rework">Cần làm lại</option><option value="failed">Không đạt</option></select></label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm text-stone-700">Loại lỗi nếu có<input value={qcDefectType} onChange={(event) => setQcDefectType(event.target.value)} placeholder="Nứt men, cong vênh..." className="mt-1 w-full border border-stone-300 rounded-lg p-2" /></label>
            <label className="text-sm text-stone-700">Ghi chú QC<textarea value={qcNotes} onChange={(event) => setQcNotes(event.target.value)} rows={1} className="mt-1 w-full border border-stone-300 rounded-lg p-2" /></label>
          </div>
          <button type="submit" disabled={qcSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">{qcSubmitting ? "Đang lưu..." : "Lưu kết quả QC"}</button>
        </form>
      )}

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
