import type {
  AlertType,
  Order,
  ProductionStage,
  ProductionTask,
} from "@/types/prisma";
import { Prisma } from "@/types/prisma";
import { getOrderFeasibilityError, parseOrderText } from "@/lib/ai-parser";
import {
  alertTypeToSeverity,
  calcLeadTimeDays,
  formatDeadline,
  formatProductType,
  notifyTelegram,
} from "@/lib/notify-helpers";
import { prisma } from "@/lib/prisma";
import { ParsedOrderSpecs, STAGE_SLUGS } from "@/types";

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function generateOrderCode(): Promise<string> {
  const count = await prisma.order.count();
  return `ORD-${String(count + 1).padStart(3, "0")}`;
}

async function logActivity(
  orderId: number,
  eventType: string,
  payload?: object
) {
  await prisma.activityLog.create({
    data: {
      orderId,
      eventType,
      payload: payload ? (payload as Prisma.InputJsonValue) : undefined,
    },
  });
}

async function createAlert(
  orderId: number,
  type: AlertType,
  message: string,
  notify = true
) {
  const deduplicate = ["DELAYED", "DEADLINE_SOON", "STUCK"].includes(type);
  if (deduplicate) {
    const existing = await prisma.alert.findFirst({
      where: { orderId, type, isResolved: false },
    });
    if (existing) return existing;
  }

  const severity = alertTypeToSeverity(type);
  const alert = await prisma.alert.create({
    data: { orderId, type, message, severity },
  });

  if (notify) {
    await notifyTelegram(message, severity);
  }

  return alert;
}

export async function createOrderFromText(rawText: string) {
  const parsed = await parseOrderText(rawText);
  const feasibilityError = getOrderFeasibilityError(parsed);
  if (feasibilityError) throw new Error(feasibilityError);

  return createOrderFromParsed(rawText, parsed);
}

export async function createOrderFromParsed(
  rawText: string,
  parsed: ParsedOrderSpecs
) {
  const stages = await prisma.productionStage.findMany({
    orderBy: { sequence: "asc" },
  });

    if (
      stages.length !== STAGE_SLUGS.length ||
      stages.some((stage, index) => stage.slug !== STAGE_SLUGS[index])
    ) {
      throw new Error("Production stages chưa đúng cấu hình. Chạy seed lại trước.");
  }

  const orderCode = await generateOrderCode();
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + parsed.deadline_days);

  const firstStage = stages[0];
  const now = new Date();

  const order = await prisma.order.create({
    data: {
      orderCode,
      rawInput: rawText,
      parsedSpecs: parsed as unknown as Prisma.InputJsonValue,
      quantity: parsed.quantity,
      productType: parsed.product_type,
      glazeType: parsed.glaze_type,
      deadline,
      priority: parsed.priority,
      currentStageId: firstStage.id,
      tasks: {
        create: stages.map((stage: ProductionStage, index: number) => {
          return {
            stageId: stage.id,
            status: index === 0 ? "in_progress" : "pending",
            startedAt: index === 0 ? now : null,
              dueAt: index === 0 ? addHours(now, stage.slaHours) : null,
          };
        }),
      },
    },
    include: {
      tasks: { include: { stage: true }, orderBy: { stage: { sequence: "asc" } } },
      currentStage: true,
    },
  });

  const msg = `🆕 Đơn <b>${orderCode}</b>: ${parsed.quantity} ${formatProductType(parsed.product_type)}, giao ${formatDeadline(deadline)}`;
  await createAlert(order.id, "ORDER_CREATED", msg);
  await logActivity(order.id, "ORDER_CREATED", { parsed });

  return order;
}

export async function moveTaskToStage(taskId: number, targetStageId: number) {
  const task = await prisma.productionTask.findUnique({
    where: { id: taskId },
    include: {
      stage: true,
      order: { include: { tasks: { include: { stage: true } } } },
    },
  });

  if (!task) throw new Error("Task không tồn tại");
  if (task.order.status !== "active") throw new Error("Đơn hàng không còn active");

  const targetStage = await prisma.productionStage.findUnique({
    where: { id: targetStageId },
  });
  if (!targetStage) throw new Error("Stage không tồn tại");

  const currentTask = task.order.tasks.find(
    (t: ProductionTask & { stage: ProductionStage }) => t.status === "in_progress"
  );
  if (!currentTask) throw new Error("Không có task đang in_progress");

  if (targetStage.sequence !== currentTask.stage.sequence + 1) {
    throw new Error(
      `Phải hoàn thành stage "${currentTask.stage.name}" trước khi chuyển sang "${targetStage.name}"`
    );
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.productionTask.update({
      where: { id: currentTask.id },
      data: { status: "completed", completedAt: now },
    }),
    prisma.productionTask.update({
      where: { id: taskId },
      data: {
        status: "in_progress",
        startedAt: now,
        dueAt: addHours(now, targetStage.slaHours),
      },
    }),
    prisma.order.update({
      where: { id: task.orderId },
      data: { currentStageId: targetStageId },
    }),
  ]);

  const msg = `➡️ <b>${task.order.orderCode}</b>: ${currentTask.stage.name} → ${targetStage.name}`;
  await createAlert(task.orderId, "STAGE_CHANGED", msg);
  await logActivity(task.orderId, "STAGE_CHANGED", {
    from: currentTask.stage.slug,
    to: targetStage.slug,
  });

  if (targetStage.slug === "kiem_tra_giao") {
    // Will complete on final stage complete call
  }

  return prisma.order.findUnique({
    where: { id: task.orderId },
    include: {
      tasks: { include: { stage: true }, orderBy: { stage: { sequence: "asc" } } },
      currentStage: true,
    },
  });
}

export async function completeCurrentStage(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tasks: { include: { stage: true }, orderBy: { stage: { sequence: "asc" } } },
    },
  });

  if (!order) throw new Error("Đơn hàng không tồn tại");
  if (order.status !== "active") throw new Error("Đơn hàng không còn active");

  const currentTask = order.tasks.find(
    (t: ProductionTask & { stage: ProductionStage }) => t.status === "in_progress"
  );
  if (!currentTask) throw new Error("Không có stage đang thực hiện");

  const now = new Date();
  const isLastStage = currentTask.stage.slug === "kiem_tra_giao";

  if (isLastStage) {
    await prisma.$transaction([
      prisma.productionTask.update({
        where: { id: currentTask.id },
        data: { status: "completed", completedAt: now },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: "completed", completedAt: now },
      }),
      prisma.alert.updateMany({
        where: { orderId, isResolved: false },
        data: { isResolved: true },
      }),
    ]);

    const days = calcLeadTimeDays(order.createdAt, now);
    const msg = `✅ <b>${order.orderCode}</b> hoàn thành — lead time: ${days} ngày`;
    await createAlert(orderId, "ORDER_COMPLETED", msg);
    await logActivity(orderId, "ORDER_COMPLETED", { leadTimeDays: days });
  } else {
    const nextTask = order.tasks.find(
      (t: ProductionTask & { stage: ProductionStage }) =>
        t.stage.sequence === currentTask.stage.sequence + 1
    );
    if (!nextTask) throw new Error("Không tìm thấy stage tiếp theo");

    await prisma.$transaction([
      prisma.productionTask.update({
        where: { id: currentTask.id },
        data: { status: "completed", completedAt: now },
      }),
      prisma.productionTask.update({
        where: { id: nextTask.id },
        data: {
          status: "in_progress",
          startedAt: now,
          dueAt: addHours(now, nextTask.stage.slaHours),
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { currentStageId: nextTask.stageId },
      }),
    ]);

    const msg = `➡️ <b>${order.orderCode}</b>: ${currentTask.stage.name} → ${nextTask.stage.name}`;
    await createAlert(orderId, "STAGE_CHANGED", msg);
    await logActivity(orderId, "STAGE_CHANGED", {
      from: currentTask.stage.slug,
      to: nextTask.stage.slug,
    });
  }

  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tasks: { include: { stage: true }, orderBy: { stage: { sequence: "asc" } } },
      currentStage: true,
      activityLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export async function runSlaCheck() {
  const now = new Date();
  const results = { delayed: 0, deadlineSoon: 0, stuck: 0 };

  const activeTasks = await prisma.productionTask.findMany({
    where: { status: "in_progress" },
    include: { stage: true, order: true },
  });

  for (const task of activeTasks) {
    if (task.dueAt && task.dueAt < now && task.order.status === "active") {
      const msg = `⚠️ <b>${task.order.orderCode}</b> trễ SLA stage ${task.stage.name}`;
      await createAlert(task.orderId, "DELAYED", msg);
      results.delayed++;
    }

    if (task.startedAt) {
      const stuckHours = (now.getTime() - task.startedAt.getTime()) / (1000 * 60 * 60);
      if (stuckHours > 48 && task.order.status === "active") {
        const msg = `🚨 <b>${task.order.orderCode}</b> stuck ${Math.floor(stuckHours)}h tại ${task.stage.name}`;
        await createAlert(task.orderId, "STUCK", msg);
        results.stuck++;
      }
    }
  }

  const activeOrders = await prisma.order.findMany({
    where: { status: "active" },
  });

  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  for (const order of activeOrders) {
    if (order.deadline <= in24h && order.deadline > now) {
      const msg = `⏰ <b>${order.orderCode}</b> còn 24h deadline (${formatDeadline(order.deadline)})`;
      await createAlert(order.id, "DEADLINE_SOON", msg);
      results.deadlineSoon++;
    }
  }

  return results;
}

export type OrderWithRelations = Order & {
  tasks: (ProductionTask & { stage: ProductionStage })[];
  currentStage: ProductionStage | null;
};
