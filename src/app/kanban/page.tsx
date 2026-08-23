import KanbanBoard from "@/components/KanbanBoard";

export default function KanbanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-900">Kanban Board</h1>
        <p className="text-stone-500 text-sm mt-1">
          Theo dõi tiến độ sản xuất theo từng công đoạn — tự refresh mỗi 8 giây
        </p>
      </div>
      <KanbanBoard />
    </div>
  );
}
