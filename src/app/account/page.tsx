"use client";

import { useEffect, useState } from "react";

export default function AccountPage() {
  const [chatId, setChatId] = useState("");
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setChatId(data?.telegramChatId ?? ""));
  }, []);

  const saveTelegram = async () => {
    setSaved(false);
    setMessage("");
    const response = await fetch("/api/auth/telegram", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Không thể lưu Telegram");
      return;
    }
    setChatId(data.telegramChatId ?? "");
    setSaved(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-900">Tài khoản</h1>
        <p className="text-stone-500 text-sm mt-1">Thiết lập nơi nhận thông báo riêng về đơn hàng của bạn.</p>
      </div>
      <section className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-4">
        <div>
          <h2 className="font-semibold text-stone-900">Telegram cá nhân</h2>
          <p className="text-sm text-stone-500 mt-1">Nhập Chat ID sau khi bạn đã gửi /start cho bot Telegram.</p>
        </div>
        <label className="block text-sm font-medium text-stone-700">
          Telegram Chat ID
          <input value={chatId} onChange={(event) => setChatId(event.target.value)} placeholder="Ví dụ: 123456789" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-amber-500" />
        </label>
        <button type="button" onClick={saveTelegram} className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700">Lưu Telegram cá nhân</button>
        {saved && <p className="text-sm text-emerald-700">Đã liên kết Telegram. Các thông báo đơn của bạn sẽ được gửi riêng.</p>}
        {message && <p className="text-sm text-red-700">{message}</p>}
      </section>
    </div>
  );
}