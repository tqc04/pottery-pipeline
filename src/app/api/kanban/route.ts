import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ProductionStage, ActiveOrderForKanban } from "@/types/prisma";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const stages: ProductionStage[] = await prisma.productionStage.findMany({
    orderBy: { sequence: "asc" },
  });

  const activeOrders: ActiveOrderForKanban[] = await prisma.order.findMany({
    where: {
      status: "active",
      ...(session.role !== "admin" && { createdById: session.userId }),
    },
    include: {
      currentStage: true,
      tasks: {
        where: { status: "in_progress" },
        include: { stage: true },
      },
    },
    orderBy: [{ priority: "desc" }, { deadline: "asc" }],
  });

  const columns = stages.map((stage: ProductionStage) => ({
    stage: {
      id: stage.id,
      name: stage.name,
      slug: stage.slug,
      sequence: stage.sequence,
      slaHours: stage.slaHours,
    },
    tasks: activeOrders
      .filter((o: ActiveOrderForKanban) => o.currentStageId === stage.id)
      .map((o: ActiveOrderForKanban) => {
        const task = o.tasks[0];
        return {
          id: task?.id ?? o.id,
          orderId: o.id,
          stageId: stage.id,
          status: task?.status ?? "in_progress",
          startedAt: task?.startedAt?.toISOString() ?? null,
          completedAt: task?.completedAt?.toISOString() ?? null,
          dueAt: task?.dueAt?.toISOString() ?? null,
          order: {
            id: o.id,
            orderCode: o.orderCode,
            quantity: o.quantity,
            productType: o.productType,
            glazeType: o.glazeType,
            deadline: o.deadline.toISOString(),
            priority: o.priority,
            status: o.status,
          },
        };
      }),
  }));

  return NextResponse.json(columns);
}
