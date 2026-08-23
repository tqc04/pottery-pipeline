import type {
  Order,
  ProductionStage,
  ProductionTask,
} from "@prisma/client";

export type {
  Alert,
  AlertSeverity,
  AlertType,
  Order,
  Priority,
  ProductionStage,
  ProductionTask,
  TaskStatus,
  OrderStatus,
} from "@prisma/client";

export { Prisma, PrismaClient } from "@prisma/client";

export type OrderWithTasks = Order & {
  tasks: (ProductionTask & { stage: ProductionStage })[];
  currentStage: ProductionStage | null;
};

export type ActiveOrderForKanban = Order & {
  currentStage: ProductionStage | null;
  tasks: (ProductionTask & { stage: ProductionStage })[];
};

export type CompletedOrderLeadTime = {
  createdAt: Date;
  completedAt: Date | null;
};
