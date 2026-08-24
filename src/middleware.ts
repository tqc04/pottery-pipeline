import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("pottery_session")?.value;
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (request.nextUrl.pathname === "/" && session.split(".")[1] !== "admin") {
    return NextResponse.redirect(new URL("/kanban", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/account/:path*", "/kanban/:path*", "/orders/:path*"],
};
