import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CompletedOrderLeadTime } from "@/types/prisma";
import { PRODUCT_LABELS } from "@/types";
import { isAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

type DashboardPeriod = "7d" | "30d" | "12m";

function getPeriod(value: string | null): DashboardPeriod {
  return value === "30d" || value === "12m" ? value : "7d";
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getReferenceDate(value: string | null, fallback: Date) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Chỉ admin được xem Dashboard tổng" }, { status: 403 });
  const now = new Date();
  const searchParams = new URL(request.url).searchParams;
  const period = getPeriod(searchParams.get("period"));
  const referenceDate = getReferenceDate(searchParams.get("date"), now);
  const selectedDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const startOfSelectedDate = selectedDate;
  const endOfSelectedDate = new Date(selectedDate);
  endOfSelectedDate.setDate(endOfSelectedDate.getDate() + 1);
  const rangeStart =
    period === "12m"
      ? new Date(startOfMonth(selectedDate).getFullYear(), startOfMonth(selectedDate).getMonth() - 11, 1)
      : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - (period === "30d" ? 29 : 6));

  const [activeOrders, delayedTasks, completedToday, alertsCount, completedOrders, periodOrders, activeOrderDetails] =
    await Promise.all([
      prisma.order.count({ where: { status: "active" } }),
      prisma.productionTask.count({
        where: {
          status: "in_progress",
          dueAt: { lt: now },
          order: { status: "active" },
        },
      }),
      prisma.order.count({
        where: {
          status: "completed",
          completedAt: { gte: startOfSelectedDate, lt: endOfSelectedDate },
        },
      }),
      prisma.alert.count({ where: { isResolved: false } }),
      prisma.order.findMany({
        where: { status: "completed", completedAt: { not: null } },
        select: { createdAt: true, completedAt: true },
      }),
      prisma.order.findMany({
        where: {
          OR: [{ createdAt: { gte: rangeStart } }, { completedAt: { gte: rangeStart } }],
        },
        select: { createdAt: true, completedAt: true, quantity: true },
      }),
      prisma.order.findMany({
        where: { status: "active" },
        select: { productType: true, currentStage: { select: { name: true } } },
      }),
    ]);

  let avgLeadTimeDays = 0;
  if (completedOrders.length > 0) {
    const totalDays = (completedOrders as CompletedOrderLeadTime[]).reduce(
      (sum: number, o: CompletedOrderLeadTime) => {
        const diff = o.completedAt!.getTime() - o.createdAt.getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      },
      0
    );
    avgLeadTimeDays = Math.round((totalDays / completedOrders.length) * 10) / 10;
  }

  const trend = [];
  const pointCount = period === "12m" ? 12 : period === "30d" ? 30 : 7;
  for (let index = pointCount - 1; index >= 0; index -= 1) {
    const date = new Date(rangeStart);
    if (period === "12m") date.setMonth(rangeStart.getMonth() + (11 - index));
    else date.setDate(rangeStart.getDate() + (pointCount - 1 - index));

    const key = period === "12m"
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const label = period === "12m"
      ? date.toLocaleDateString("vi-VN", { month: "short" })
      : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    const matches = (value: Date | null, target: string) => {
      if (!value) return false;
      const valueKey = period === "12m"
        ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`
        : `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
      return valueKey === target;
    };
    const createdOrders = periodOrders.filter((order) => matches(order.createdAt, key));
    const completed = periodOrders.filter((order) => matches(order.completedAt, key));
    trend.push({
      key,
      label,
      created: createdOrders.length,
      completed: completed.length,
      quantity: createdOrders.reduce((sum, order) => sum + order.quantity, 0),
    });
  }

  const countBreakdown = (values: string[]) =>
    Object.entries(values.reduce<Record<string, number>>((counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    }, {}))
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

  return NextResponse.json({
    activeOrders,
    delayedOrders: delayedTasks,
    completedToday,
    avgLeadTimeDays,
    alertsCount,
    period,
    selectedDate: formatDate(selectedDate),
    trend,
    stageBreakdown: countBreakdown(activeOrderDetails.map((order) => order.currentStage?.name ?? "Chưa phân công")),
    productBreakdown: countBreakdown(activeOrderDetails.map((order) => PRODUCT_LABELS[order.productType] ?? order.productType)),
  });
}
