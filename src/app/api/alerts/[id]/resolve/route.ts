import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/types/prisma";
import { isAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdmin(_request)) {
    return NextResponse.json({ error: "Chỉ admin được đóng cảnh báo" }, { status: 403 });
  }
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  try {
    const alert = await prisma.alert.update({
      where: { id },
      data: { isResolved: true },
    });

    return NextResponse.json(alert);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Không tìm thấy cảnh báo" }, { status: 404 });
    }
    return NextResponse.json({ error: "Không thể xử lý cảnh báo" }, { status: 400 });
  }
}
