"use client";

import OrderCard from "@/components/OrderCard";
import { KanbanColumn, KanbanTask } from "@/types";

interface KanbanColumnProps {
  column: KanbanColumn;
  onAdvance: (orderId: number) => void;
  advancingId: number | null;
}

export default function KanbanColumnComponent({
  column,
  onAdvance,
  advancingId,
}: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-72 bg-stone-100/80 rounded-xl p-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-semibold text-stone-800 text-sm">{column.stage.name}</h3>
        <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">
          {column.tasks.length}
        </span>
      </div>
      <p className="text-xs text-stone-400 mb-3 px-1">SLA: {column.stage.slaHours}h</p>
      <div className="space-y-3 min-h-[120px]">
        {column.tasks.map((task: KanbanTask) => (
          <OrderCard
            key={task.orderId}
            task={task}
            onAdvance={onAdvance}
            advancing={advancingId === task.orderId}
          />
        ))}
        {column.tasks.length === 0 && (
          <p className="text-xs text-stone-400 text-center py-8">Trống</p>
        )}
      </div>
    </div>
  );
}
