import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const STAGES = [
  { name: "Tạo hình mộc", slug: "tao_hinh_moc", sequence: 1, slaHours: 24 },
  { name: "Phơi sấy & Sửa mộc", slug: "phoi_say_sua_moc", sequence: 2, slaHours: 24 },
  { name: "Vẽ họa tiết", slug: "ve_hoa_tiet", sequence: 3, slaHours: 24 },
  { name: "Tráng men", slug: "trang_men", sequence: 4, slaHours: 24 },
  { name: "Nung lò", slug: "nung_lo", sequence: 5, slaHours: 48 },
  { name: "QC & Đóng gói", slug: "qc_dong_goi", sequence: 6, slaHours: 8 },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Migrate the original five-stage demo names before adding the new stage.
  const legacyMigrations = [
    ["tiep_nhan", "Tạo hình mộc", "tao_hinh_moc", 1, 24],
    ["tao_khuon", "Phơi sấy & Sửa mộc", "phoi_say_sua_moc", 2, 24],
    ["nung", "Vẽ họa tiết", "ve_hoa_tiet", 3, 24],
    ["kiem_tra_giao", "QC & Đóng gói", "qc_dong_goi", 6, 8],
  ] as const;
  for (const [oldSlug, name, slug, sequence, slaHours] of legacyMigrations) {
    await prisma.productionStage.updateMany({
      where: { slug: oldSlug },
      data: { name, slug, sequence, slaHours },
    });
  }

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

  const adminEmail = process.env.ADMIN_EMAIL || "admin@pottery.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const userEmail = process.env.USER_EMAIL || "user@pottery.local";
  const userPassword = process.env.USER_PASSWORD || "user123";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "admin", passwordHash: hashPassword(adminPassword) },
    create: { email: adminEmail, role: "admin", passwordHash: hashPassword(adminPassword) },
  });
  await prisma.user.upsert({
    where: { email: userEmail },
    update: { role: "user", passwordHash: hashPassword(userPassword) },
    create: { email: userEmail, role: "user", passwordHash: hashPassword(userPassword) },
  });

  const existingOrdersForMigration = await prisma.order.findMany({
    select: { id: true },
  });
  for (const order of existingOrdersForMigration) {
    const existingTasks = await prisma.productionTask.findMany({
      where: { orderId: order.id },
      select: { stageId: true },
    });
    const taskStageIds = new Set(existingTasks.map((task) => task.stageId));
    const missingStages = stages.filter((stage) => !taskStageIds.has(stage.id));
    if (missingStages.length > 0) {
      await prisma.productionTask.createMany({
        data: missingStages.map((stage) => ({ orderId: order.id, stageId: stage.id })),
        skipDuplicates: true,
      });
    }
  }

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
          height_cm: null,
          clay_amount_kg: null,
          firing_temperature_c: null,
          firing_duration_hours: null,
        },
        quantity: sample.quantity,
        productType: sample.productType,
        glazeType: sample.glazeType,
        deadline,
        priority: sample.priority,
        heightCm: null,
        clayAmountKg: null,
        firingTemperatureC: null,
        firingDurationHours: null,
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
