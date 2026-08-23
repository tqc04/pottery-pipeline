import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAGES = [
  { name: "Tiếp nhận", slug: "tiep_nhan", sequence: 1, slaHours: 4 },
  { name: "Tạo khuôn", slug: "tao_khuon", sequence: 2, slaHours: 24 },
  { name: "Nung", slug: "nung", sequence: 3, slaHours: 48 },
  { name: "Tráng men", slug: "trang_men", sequence: 4, slaHours: 24 },
  { name: "Kiểm tra & Giao", slug: "kiem_tra_giao", sequence: 5, slaHours: 8 },
];

async function main() {
  console.log("🌱 Seeding database...");

  for (const stage of STAGES) {
    await prisma.productionStage.upsert({
      where: { slug: stage.slug },
      update: stage,
      create: stage,
    });
  }

  const stages = await prisma.productionStage.findMany({
    orderBy: { sequence: "asc" },
  });

  const existingOrders = await prisma.order.count();
  if (existingOrders > 0) {
    console.log("✅ Stages seeded. Orders already exist, skipping sample orders.");
    return;
  }

  const sampleOrders = [
    {
      orderCode: "ORD-001",
      rawInput: "50 ly sứ trắng men bóng, giao trong 7 ngày",
      quantity: 50,
      productType: "ly_su",
      glazeType: "trắng men bóng",
      priority: "normal" as const,
      deadlineDays: 7,
      currentStageIndex: 1,
    },
    {
      orderCode: "ORD-002",
      rawInput: "30 bát gốm men xanh, giao gấp 5 ngày",
      quantity: 30,
      productType: "bat",
      glazeType: "men xanh",
      priority: "urgent" as const,
      deadlineDays: 5,
      currentStageIndex: 2,
    },
    {
      orderCode: "ORD-003",
      rawInput: "20 ấm trà men đỏ truyền thống",
      quantity: 20,
      productType: "am_tra",
      glazeType: "men đỏ",
      priority: "normal" as const,
      deadlineDays: 14,
      currentStageIndex: 0,
    },
  ];

  const now = new Date();

  for (const sample of sampleOrders) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + sample.deadlineDays);

    const currentStage = stages[sample.currentStageIndex];

    const order = await prisma.order.create({
      data: {
        orderCode: sample.orderCode,
        rawInput: sample.rawInput,
        parsedSpecs: {
          product_type: sample.productType,
          quantity: sample.quantity,
          glaze_type: sample.glazeType,
          deadline_days: sample.deadlineDays,
          priority: sample.priority,
        },
        quantity: sample.quantity,
        productType: sample.productType,
        glazeType: sample.glazeType,
        deadline,
        priority: sample.priority,
        currentStageId: currentStage.id,
        tasks: {
          create: stages.map((stage, index) => {
            const isPast = index < sample.currentStageIndex;
            const isCurrent = index === sample.currentStageIndex;
            const startedAt = index <= sample.currentStageIndex ? now : null;
            const sla =
              sample.priority === "urgent"
                ? Math.floor(stage.slaHours * 0.7)
                : stage.slaHours;

            return {
              stageId: stage.id,
              status: isPast ? "completed" : isCurrent ? "in_progress" : "pending",
              startedAt: isCurrent || isPast ? startedAt : null,
              completedAt: isPast ? now : null,
              dueAt: isCurrent
                ? new Date(now.getTime() + sla * 60 * 60 * 1000)
                : null,
            };
          }),
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        orderId: order.id,
        eventType: "ORDER_CREATED",
        payload: { source: "seed" },
      },
    });
  }

  console.log("✅ Seeded stages + 3 sample orders");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
