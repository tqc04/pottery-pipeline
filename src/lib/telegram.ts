const TELEGRAM_API = "https://api.telegram.org/bot";

export interface TelegramReplyMarkup {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
}

async function telegramRequest(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch(`${TELEGRAM_API}${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (error) {
    console.error("[Telegram Error]", error);
    return false;
  }
}

export async function sendTelegramMessage(
  message: string,
  replyMarkup?: TelegramReplyMarkup,
  targetChatId?: string
): Promise<boolean> {
  const chatId = targetChatId || process.env.TELEGRAM_CHAT_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
    console.log("[Telegram Mock]", message, replyMarkup ? "[inline button]" : "");
    return false;
  }

  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
    ...(replyMarkup && { reply_markup: replyMarkup }),
  });
}

export async function answerTelegramCallback(callbackQueryId: string, text: string, showAlert = false) {
  return telegramRequest("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

export async function editTelegramMessage(
  chatId: number | string,
  messageId: number,
  text: string
) {
  return telegramRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [] },
  });
}
