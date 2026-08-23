import { NextRequest, NextResponse } from "next/server";
import { parseOrderText } from "@/lib/ai-parser";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rawText } = body as { rawText?: string };

    if (!rawText?.trim()) {
      return NextResponse.json({ error: "rawText là bắt buộc" }, { status: 400 });
    }

    const parsed = await parseOrderText(rawText.trim());
    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi parse";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
