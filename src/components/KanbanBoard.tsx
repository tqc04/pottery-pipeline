"use client";

import { useCallback, useEffect, useState } from "react";
import KanbanColumnComponent from "@/components/KanbanColumn";
import { KanbanColumn } from "@/types";

export default function KanbanBoard() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancingId, setAdvancingId] = useState<number | null>(null);

  const fetchKanban = useCallback(async () => {
    try {
      const res = await fetch("/api/kanban");
      const data = await res.json();
      setColumns(data);
    } catch (error) {
      console.error("Failed to fetch kanban:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKanban();
    const interval = setInterval(fetchKanban, 8000);
    return () => clearInterval(interval);
  }, [fetchKanban]);

  const handleAdvance = async (orderId: number) => {
    setAdvancingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/advance`, { method: "POST" });
      if (res.ok) {
        await fetchKanban();
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi chuyển stage");
      }
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setAdvancingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <p className="text-stone-500">Đang tải Kanban...</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {columns.map((col) => (
          <KanbanColumnComponent
            key={col.stage.id}
            column={col}
            onAdvance={handleAdvance}
            advancingId={advancingId}
          />
        ))}
      </div>
    </div>
  );
}
