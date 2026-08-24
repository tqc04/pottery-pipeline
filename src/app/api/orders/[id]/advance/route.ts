import { NextRequest, NextResponse } from "next/server";
import { completeCurrentStage } from "@/lib/workflow";
import { isAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdmin(_request)) {
    return NextResponse.json({ error: "Chỉ admin được chuyển công đoạn" }, { status: 403 });
  }
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  try {
    const order = await completeCurrentStage(id);
    return NextResponse.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi chuyển stage";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
