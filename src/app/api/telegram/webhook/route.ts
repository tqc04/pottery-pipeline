import { NextRequest, NextResponse } from "next/server";
import { answerTelegramCallback, editTelegramMessage } from "@/lib/telegram";
import { completeCurrentStage } from "@/lib/workflow";

export const dynamic = "force-dynamic";

interface TelegramUpdate {
  callback_query?: {
    id: string;
    data?: string;
    message?: {
      chat: { id: number };
      message_id: number;
      text?: string;
    };
  };
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!webhookSecret || request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = (await request.json()) as TelegramUpdate;
    const callback = update.callback_query;
    if (!callback?.data?.startsWith("complete_stage:")) {
      return NextResponse.json({ ok: true });
    }

    const orderId = Number.parseInt(callback.data.replace("complete_stage:", ""), 10);
    if (!Number.isInteger(orderId)) {
      await answerTelegramCallback(callback.id, "Mã đơn không hợp lệ", true);
      return NextResponse.json({ ok: true });
    }

    try {
      await completeCurrentStage(orderId);
      await answerTelegramCallback(callback.id, "Đã xác nhận hoàn thành công đoạn");
      if (callback.message) {
        await editTelegramMessage(
          callback.message.chat.id,
          callback.message.message_id,
          `${callback.message.text ?? "Thông báo công đoạn"}\n\n✅ Đã xác nhận hoàn thành công đoạn từ Telegram.`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật công đoạn";
      await answerTelegramCallback(callback.id, message.slice(0, 180), true);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid Telegram update" }, { status: 400 });
  }
}
