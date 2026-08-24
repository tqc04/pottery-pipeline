import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  try {
    const body = await request.json();
    const chatId = typeof body.chatId === "string" ? body.chatId.trim() : "";
    if (chatId && !/^-?\d{5,20}$/.test(chatId)) {
      return NextResponse.json({ error: "Telegram Chat ID phải là chuỗi số hợp lệ" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { telegramChatId: chatId || null },
      select: { telegramChatId: true },
    });
    return NextResponse.json({ telegramChatId: user.telegramChatId });
  } catch {
    return NextResponse.json({ error: "Không thể cập nhật Telegram Chat ID" }, { status: 400 });
  }
}
