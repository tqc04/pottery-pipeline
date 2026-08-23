import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/types/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      currentStage: true,
      tasks: { include: { stage: true }, orderBy: { stage: { sequence: "asc" } } },
      activityLogs: { orderBy: { createdAt: "desc" } },
      alerts: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { priority, deadline } = body as {
      priority?: string;
      deadline?: string;
    };
    const validPriorities = ["normal", "urgent"];

    if (priority !== undefined && !validPriorities.includes(priority)) {
      return NextResponse.json({ error: "priority không hợp lệ" }, { status: 400 });
    }

    let parsedDeadline: Date | undefined;
    if (deadline !== undefined) {
      parsedDeadline = new Date(deadline);
      if (Number.isNaN(parsedDeadline.getTime()) || parsedDeadline <= new Date()) {
        return NextResponse.json({ error: "deadline không hợp lệ" }, { status: 400 });
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(priority && { priority: priority as "normal" | "urgent" }),
        ...(parsedDeadline && { deadline: parsedDeadline }),
      },
      include: { currentStage: true },
    });

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
    }
    return NextResponse.json({ error: "Dữ liệu cập nhật không hợp lệ" }, { status: 400 });
  }
}
