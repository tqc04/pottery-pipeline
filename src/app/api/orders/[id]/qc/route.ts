import { NextRequest, NextResponse } from "next/server";
import { recordQcInspection } from "@/lib/workflow";
import { isAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Chỉ admin được nhập kết quả QC" }, { status: 403 });
  }
  const orderId = Number.parseInt(params.id, 10);
  if (Number.isNaN(orderId)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const inspectedQuantity = Number(body.inspectedQuantity);
    const defectQuantity = Number(body.defectQuantity ?? 0);
    const result = body.result as "passed" | "failed" | "rework";
    const validResults = ["passed", "failed", "rework"];

    if (!Number.isInteger(inspectedQuantity) || !Number.isInteger(defectQuantity)) {
      return NextResponse.json({ error: "Số lượng QC phải là số nguyên" }, { status: 400 });
    }
    if (!validResults.includes(result)) {
      return NextResponse.json({ error: "Kết quả QC không hợp lệ" }, { status: 400 });
    }

    const inspection = await recordQcInspection({
      orderId,
      inspectedQuantity,
      defectQuantity,
      defectType: typeof body.defectType === "string" ? body.defectType : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      result,
    });
    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể lưu kết quả QC";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
