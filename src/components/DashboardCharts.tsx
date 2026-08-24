import type { DashboardBreakdown, DashboardTrendPoint } from "@/types";

interface DashboardChartsProps {
  trend: DashboardTrendPoint[];
  stageBreakdown: DashboardBreakdown[];
  productBreakdown: DashboardBreakdown[];
  period: "7d" | "30d" | "12m";
}

const chartWidth = 760;
const chartHeight = 240;
const chartPadding = { top: 18, right: 18, bottom: 34, left: 34 };

function getPoints(values: number[], max: number) {
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  return values
    .map((value, index) => {
      const x = chartPadding.left + (index / Math.max(values.length - 1, 1)) * plotWidth;
      const y = chartPadding.top + plotHeight - (value / max) * plotHeight;
      return `${x},${y}`;
    })
    .join(" ");
}

function BreakdownList({ items, accent }: { items: DashboardBreakdown[]; accent: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Chưa có đơn đang sản xuất.</p>
      ) : (
        items.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between gap-3 text-sm mb-1.5">
              <span className="text-stone-700 truncate">{item.label}</span>
              <span className="font-semibold text-stone-900">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${accent}`}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function DashboardCharts({ trend, stageBreakdown, productBreakdown, period }: DashboardChartsProps) {
  const maxValue = Math.max(...trend.flatMap((point) => [point.created, point.completed]), 1);
  const createdPoints = getPoints(trend.map((point) => point.created), maxValue);
  const completedPoints = getPoints(trend.map((point) => point.completed), maxValue);
  const labelEvery = period === "30d" ? 5 : 1;
  const yTicks = [maxValue, Math.ceil(maxValue / 2), 0];

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="font-semibold text-stone-900">Nhịp độ sản xuất</h2>
            <p className="text-sm text-stone-500 mt-1">So sánh số đơn mới và đơn đã hoàn thành</p>
          </div>
          <div className="flex gap-4 text-xs text-stone-600">
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-amber-500" />Đơn mới</span>
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Hoàn thành</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[620px] h-60" role="img" aria-label="Biểu đồ đơn mới và đơn hoàn thành">
            {yTicks.map((tick, index) => {
              const y = chartPadding.top + ((chartHeight - chartPadding.top - chartPadding.bottom) * index) / 2;
              return (
                <g key={tick}>
                  <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke="#e7e5e4" strokeDasharray="3 4" />
                  <text x={4} y={y + 4} className="fill-stone-400 text-[11px]">{tick}</text>
                </g>
              );
            })}
            <polyline points={createdPoints} fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={completedPoints} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {trend.map((point, index) => {
              const x = chartPadding.left + (index / Math.max(trend.length - 1, 1)) * (chartWidth - chartPadding.left - chartPadding.right);
              const y = chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) - (point.created / maxValue) * (chartHeight - chartPadding.top - chartPadding.bottom);
              const completedY = chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) - (point.completed / maxValue) * (chartHeight - chartPadding.top - chartPadding.bottom);
              return (
                <g key={point.key}>
                  <circle cx={x} cy={y} r="4" fill="#d97706" stroke="white" strokeWidth="2" />
                  <circle cx={x} cy={completedY} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
                  {(index % labelEvery === 0 || index === trend.length - 1) && <text x={x} y={chartHeight - 8} textAnchor="middle" className="fill-stone-400 text-[10px]">{point.label}</text>}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-500">
          <span>Tổng đơn mới: <strong className="text-stone-800">{trend.reduce((sum, point) => sum + point.created, 0)}</strong></span>
          <span>Sản lượng: <strong className="text-stone-800">{trend.reduce((sum, point) => sum + point.quantity, 0)} sản phẩm</strong></span>
          <span>Hoàn thành: <strong className="text-emerald-700">{trend.reduce((sum, point) => sum + point.completed, 0)}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h2 className="font-semibold text-stone-900 mb-1">Đơn đang ở công đoạn nào?</h2>
          <p className="text-sm text-stone-500 mb-5">Phân bổ theo trạng thái hiện tại</p>
          <BreakdownList items={stageBreakdown} accent="bg-amber-500" />
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h2 className="font-semibold text-stone-900 mb-1">Cơ cấu sản phẩm</h2>
          <p className="text-sm text-stone-500 mb-5">Các loại đang nằm trong pipeline</p>
          <BreakdownList items={productBreakdown} accent="bg-emerald-500" />
        </div>
      </div>
    </section>
  );
}
