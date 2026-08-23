import { NextRequest, NextResponse } from "next/server";
import { completeCurrentStage } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
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
