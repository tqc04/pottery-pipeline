import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const alerts = await prisma.alert.findMany({
    where: {
      isResolved: false,
      ...(session.role !== "admin" && { order: { createdById: session.userId } }),
    },
    include: { order: { select: { orderCode: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(alerts);
}
