import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { telegramChatId: true } });
  return NextResponse.json({ authenticated: true, role: session.role, expiresAt: session.expiresAt, telegramChatId: user?.telegramChatId ?? null });
}
