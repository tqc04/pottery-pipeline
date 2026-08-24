"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ParsedOrderSpecs, PRODUCT_LABELS } from "@/types";

export default function NewOrderPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState(
    "50 ly sứ trắng men bóng, giao trong 7 ngày"
  );
  const [parsed, setParsed] = useState<ParsedOrderSpecs | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePreview = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orders/parse-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();
      if (res.ok) setParsed(data);
      else alert(data.error || "Không thể phân tích đơn hàng");
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!rawText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/orders/${data.id}`);
      } else {
        alert(data.error || "Không thể tạo đơn hàng");
      }
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-900">Tạo đơn hàng mới</h1>
        <p className="text-stone-500 text-sm mt-1">
          Mô tả đơn bằng tiếng Việt tự nhiên — AI sẽ tự bóc tách thông số
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Mô tả đơn hàng
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={4}
            className="w-full border border-stone-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            placeholder="VD: 100 đĩa gốm men xanh, giao gấp trong 5 ngày"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            disabled={loading}
            className="px-4 py-2 border border-amber-300 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-50 disabled:opacity-50"
          >
            {loading ? "Đang phân tích..." : "🤖 AI Preview"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            {submitting ? "Đang tạo..." : "✅ Tạo đơn & Khởi tạo pipeline"}
          </button>
        </div>
      </div>

      {parsed && (
        <div className="bg-white rounded-xl border border-green-200 p-6 shadow-sm">
          <h2 className="font-semibold text-green-800 mb-3">Kết quả AI phân tích</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-stone-500">Sản phẩm</dt>
              <dd className="font-medium">
                {PRODUCT_LABELS[parsed.product_type] || parsed.product_type}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Số lượng</dt>
              <dd className="font-medium">{parsed.quantity}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Loại men</dt>
              <dd className="font-medium">{parsed.glaze_type}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Deadline</dt>
              <dd className="font-medium">{parsed.deadline_days} ngày</dd>
            </div>
            <div>
              <dt className="text-stone-500">Ưu tiên</dt>
              <dd className="font-medium">
                {parsed.priority === "urgent" ? "🔥 Gấp" : "Bình thường"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Confidence</dt>
              <dd className="font-medium">{(parsed.confidence * 100).toFixed(0)}%</dd>
            </div>
            <div>
              <dt className="text-stone-500">Chiều cao</dt>
              <dd className="font-medium">{parsed.height_cm ? `${parsed.height_cm} cm` : "Chưa xác định"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Đất sét dự kiến</dt>
              <dd className="font-medium">{parsed.clay_amount_kg ? `${parsed.clay_amount_kg} kg` : "Chưa xác định"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Nhiệt độ nung</dt>
              <dd className="font-medium">{parsed.firing_temperature_c ? `${parsed.firing_temperature_c} °C` : "Chưa xác định"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Thời gian nung</dt>
              <dd className="font-medium">{parsed.firing_duration_hours ? `${parsed.firing_duration_hours} giờ` : "Chưa xác định"}</dd>
            </div>
          </dl>
          {parsed.notes && (
            <p className="text-xs text-stone-500 mt-3">Ghi chú: {parsed.notes}</p>
          )}
        </div>
      )}

      <div className="text-xs text-stone-400 space-y-1">
        <p>💡 Ví dụ prompt:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>50 ly sứ trắng men bóng, giao trong 7 ngày</li>
          <li>30 bát gốm men xanh, giao gấp 5 ngày</li>
          <li>20 ấm trà men đỏ truyền thống, 14 ngày</li>
        </ul>
      </div>
    </div>
  );
}
