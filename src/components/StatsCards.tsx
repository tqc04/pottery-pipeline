import { DashboardStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Đang sản xuất",
      value: stats.activeOrders,
      icon: "⚙️",
      color: "bg-blue-50 border-blue-200 text-blue-800",
    },
    {
      label: "Trễ hạn",
      value: stats.delayedOrders,
      icon: "⚠️",
      color: "bg-red-50 border-red-200 text-red-800",
    },
    {
      label: "Hoàn thành hôm nay",
      value: stats.completedToday,
      icon: "✅",
      color: "bg-green-50 border-green-200 text-green-800",
    },
    {
      label: "Lead time TB (ngày)",
      value: stats.avgLeadTimeDays,
      icon: "📊",
      color: "bg-amber-50 border-amber-200 text-amber-800",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-5 ${card.color}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium opacity-80">{card.label}</span>
            <span className="text-xl">{card.icon}</span>
          </div>
          <p className="text-3xl font-bold mt-2">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
