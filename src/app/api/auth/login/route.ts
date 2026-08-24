import { NextRequest, NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, verifyCredentials } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const user = await verifyCredentials(email, password);

    if (!user) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
    }

    const response = NextResponse.json({ role: user.role });
    response.cookies.set(SESSION_COOKIE, createSession(user.id, user.role), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Dữ liệu đăng nhập không hợp lệ" }, { status: 400 });
  }
}
