export interface ParsedOrderSpecs {
  product_type: string;
  quantity: number;
  glaze_type: string;
  deadline_days: number;
  priority: "normal" | "urgent";
  notes: string;
  confidence: number;
}

export interface KanbanColumn {
  stage: {
    id: number;
    name: string;
    slug: string;
    sequence: number;
    slaHours: number;
  };
  tasks: KanbanTask[];
}

export interface KanbanTask {
  id: number;
  orderId: number;
  stageId: number;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  dueAt: string | null;
  order: {
    id: number;
    orderCode: string;
    quantity: number;
    productType: string;
    glazeType: string | null;
    deadline: string;
    priority: string;
    status: string;
  };
}

export interface DashboardStats {
  activeOrders: number;
  delayedOrders: number;
  completedToday: number;
  avgLeadTimeDays: number;
  alertsCount: number;
}

export const PRODUCT_LABELS: Record<string, string> = {
  ly_su: "Ly sứ",
  dia: "Đĩa",
  bat: "Bát",
  binh: "Bình",
  am_tra: "Ấm trà",
  khac: "Khác",
};

export const STAGE_SLUGS = [
  "tiep_nhan",
  "tao_khuon",
  "nung",
  "trang_men",
  "kiem_tra_giao",
] as const;
