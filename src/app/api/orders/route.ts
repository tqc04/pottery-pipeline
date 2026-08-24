import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrderInputError } from "@/lib/ai-parser";
import { createOrderFromText } from "@/lib/workflow";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const status = request.nextUrl.searchParams.get("status");
  const validStatuses = ["active", "completed", "cancelled"] as const;

  if (status && !validStatuses.includes(status as (typeof validStatuses)[number])) {
    return NextResponse.json({ error: "status không hợp lệ" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: {
      ...(status && { status: status as (typeof validStatuses)[number] }),
      ...(session.role !== "admin" && { createdById: session.userId }),
    },
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
    const session = readSession(request);
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const body = await request.json();
    const { rawText } = body as { rawText?: string };

    if (!rawText?.trim()) {
      return NextResponse.json({ error: "rawText là bắt buộc" }, { status: 400 });
    }
    if (rawText.trim().length > 2000) {
      return NextResponse.json({ error: "rawText tối đa 2000 ký tự" }, { status: 400 });
    }

    const inputError = getOrderInputError(rawText);
    if (inputError) {
      return NextResponse.json({ error: inputError }, { status: 400 });
    }

    const order = await createOrderFromText(rawText.trim(), session.userId);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi tạo đơn";
    const isInputError = message.startsWith("Không thể") || message.startsWith("Đơn hàng vượt");
    return NextResponse.json({ error: message }, { status: isInputError ? 422 : 500 });
  }
}
