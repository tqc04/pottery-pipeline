"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Đăng nhập thất bại");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Không thể kết nối đến máy chủ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏺</div>
          <h1 className="text-2xl font-bold text-amber-900">Pottery Pipeline</h1>
          <p className="text-sm text-stone-500 mt-2">Đăng nhập để điều phối xưởng gốm</p>
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-stone-700">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" /></label>
          <label className="block text-sm font-medium text-stone-700">Mật khẩu<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" /></label>
        </div>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="mt-6 w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
      </form>
    </main>
  );
}
