import { NextRequest, NextResponse } from "next/server";
import { runSlaCheck } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runSlaCheck();
  return NextResponse.json({ success: true, results });
}
