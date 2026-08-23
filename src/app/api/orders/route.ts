import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOrderFromText } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  const validStatuses = ["active", "completed", "cancelled"] as const;

  if (status && !validStatuses.includes(status as (typeof validStatuses)[number])) {
    return NextResponse.json({ error: "status không hợp lệ" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: status ? { status: status as (typeof validStatuses)[number] } : undefined,
    include: {
      currentStage: true,
      tasks: { include: { stage: true }, orderBy: { stage: { sequence: "asc" } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rawText } = body as { rawText?: string };

    if (!rawText?.trim()) {
      return NextResponse.json({ error: "rawText là bắt buộc" }, { status: 400 });
    }
    if (rawText.trim().length > 2000) {
      return NextResponse.json({ error: "rawText tối đa 2000 ký tự" }, { status: 400 });
    }

    const order = await createOrderFromText(rawText.trim());
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi tạo đơn";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
