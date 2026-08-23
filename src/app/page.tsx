"use client";

import { useCallback, useEffect, useState } from "react";
import AlertList from "@/components/AlertList";
import StatsCards from "@/components/StatsCards";
import { DashboardStats } from "@/types";
import Link from "next/link";

interface AlertItem {
  id: number;
  type: string;
  message: string;
  severity: string;
  createdAt: string;
  order: { orderCode: string };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    activeOrders: 0,
    delayedOrders: 0,
    completedToday: 0,
    avgLeadTimeDays: 0,
    alertsCount: 0,
  });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const fetchData = useCallback(async () => {
    const [statsRes, alertsRes] = await Promise.all([
      fetch("/api/dashboard/stats"),
      fetch("/api/alerts"),
    ]);
    setStats(await statsRes.json());
    setAlerts(await alertsRes.json());
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleResolve = async (id: number) => {
    await fetch(`/api/alerts/${id}/resolve`, { method: "PATCH" });
    fetchData();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Dashboard</h1>
          <p className="text-stone-500 text-sm mt-1">
            Giám sát quy trình sản xuất xưởng gốm
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/orders/new"
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
          >
            + Tạo đơn mới
          </Link>
          <Link
            href="/kanban"
            className="px-4 py-2 border border-amber-300 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-50"
          >
            Xem Kanban
          </Link>
        </div>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h2 className="font-semibold text-stone-800 mb-4">
            🔔 Cảnh báo ({alerts.length})
          </h2>
          <AlertList alerts={alerts} onResolve={handleResolve} />
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h2 className="font-semibold text-stone-800 mb-4">📋 Quy trình sản xuất</h2>
          <ol className="space-y-3 text-sm">
            {[
              "Tiếp nhận — Duyệt spec đơn hàng (SLA 4h)",
              "Tạo khuôn — Chuẩn bị khuôn, đất (SLA 24h)",
              "Nung — Nung ở nhiệt độ cao (SLA 48h)",
              "Tráng men — Men, vẽ hoạ tiết (SLA 24h)",
              "Kiểm tra & Giao — QC, đóng gói (SLA 8h)",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <span className="text-stone-600">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
