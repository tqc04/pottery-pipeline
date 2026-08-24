export interface ParsedOrderSpecs {
  product_type: string;
  quantity: number;
  glaze_type: string;
  deadline_days: number;
  priority: "normal" | "urgent";
  notes: string;
  confidence: number;
  height_cm: number | null;
  clay_amount_kg: number | null;
  firing_temperature_c: number | null;
  firing_duration_hours: number | null;
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
  period: "7d" | "30d" | "12m";
  selectedDate: string;
  trend: DashboardTrendPoint[];
  stageBreakdown: DashboardBreakdown[];
  productBreakdown: DashboardBreakdown[];
}

export interface DashboardTrendPoint {
  key: string;
  label: string;
  created: number;
  completed: number;
  quantity: number;
}

export interface DashboardBreakdown {
  label: string;
  value: number;
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
  "tao_hinh_moc",
  "phoi_say_sua_moc",
  "ve_hoa_tiet",
  "trang_men",
  "nung_lo",
  "qc_dong_goi",
] as const;
