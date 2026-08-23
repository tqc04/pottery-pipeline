import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CompletedOrderLeadTime } from "@/types/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [activeOrders, delayedTasks, completedToday, alertsCount, completedOrders] =
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
          completedAt: { gte: startOfToday },
        },
      }),
      prisma.alert.count({ where: { isResolved: false } }),
      prisma.order.findMany({
        where: { status: "completed", completedAt: { not: null } },
        select: { createdAt: true, completedAt: true },
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

  return NextResponse.json({
    activeOrders,
    delayedOrders: delayedTasks,
    completedToday,
    avgLeadTimeDays,
    alertsCount,
  });
}
