"use client";

import { useCallback, useEffect, useState } from "react";
import AlertList from "@/components/AlertList";
import DashboardCharts from "@/components/DashboardCharts";
import StatsCards from "@/components/StatsCards";
import type { DashboardStats } from "@/types";
import Link from "next/link";

interface AlertItem {
  id: number;
  type: string;
  message: string;
  severity: string;
  createdAt: string;
  order: { orderCode: string };
}

function getTodayInputValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardStats["period"]>("7d");
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue);
  const [stats, setStats] = useState<DashboardStats>({
    activeOrders: 0,
    delayedOrders: 0,
    completedToday: 0,
    avgLeadTimeDays: 0,
    alertsCount: 0,
    period: "7d",
    selectedDate: "",
    trend: [],
    stageBreakdown: [],
    productBreakdown: [],
  });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const fetchData = useCallback(async () => {
    const [statsRes, alertsRes] = await Promise.all([
      fetch(`/api/dashboard/stats?period=${period}&date=${selectedDate}`),
      fetch("/api/alerts"),
    ]);
    setStats(await statsRes.json());
    setAlerts(await alertsRes.json());
  }, [period, selectedDate]);

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

      <section className="bg-amber-50 rounded-xl border border-amber-200 p-5 sm:p-6 text-stone-900 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-amber-700 text-xs font-semibold uppercase tracking-wider">Phân tích hiệu suất</p>
            <h2 className="text-xl font-semibold mt-1">Theo dõi theo ngày, tháng và năm</h2>
          </div>
          <div className="inline-flex rounded-lg bg-white border border-amber-200 p-1" role="group" aria-label="Khoảng thời gian thống kê">
            {([
              ["7d", "7 ngày"],
              ["30d", "30 ngày"],
              ["12m", "12 tháng"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`px-3 py-2 rounded-md text-xs font-medium transition ${period === value ? "bg-amber-500 text-stone-950" : "text-stone-600 hover:text-stone-900 hover:bg-amber-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <span>Ngày xem</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-md border border-amber-200 bg-white px-2.5 py-2 text-stone-900 [color-scheme:light]"
              aria-label="Chọn ngày xem thống kê"
            />
          </label>
        </div>
      </section>

      <DashboardCharts
        trend={stats.trend}
        stageBreakdown={stats.stageBreakdown}
        productBreakdown={stats.productBreakdown}
        period={stats.period}
      />

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
              "Tạo hình mộc — Tạo hình sản phẩm (SLA 24h)",
              "Phơi sấy & Sửa mộc — Ổn định phôi (SLA 24h)",
              "Vẽ họa tiết — Trang trí theo mẫu (SLA 24h)",
              "Tráng men — Men, vẽ hoạ tiết (SLA 24h)",
              "Nung lò — Nung theo nhiệt độ kỹ thuật (SLA 48h)",
              "QC & Đóng gói — Kiểm định và xuất hàng (SLA 8h)",
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
