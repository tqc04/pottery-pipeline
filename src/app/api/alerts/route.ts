import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const alerts = await prisma.alert.findMany({
    where: { isResolved: false },
    include: { order: { select: { orderCode: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(alerts);
}
