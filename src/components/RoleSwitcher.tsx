"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppRole } from "@/lib/roles";

export default function RoleSwitcher() {
  const router = useRouter();
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((session) => setRole(session?.role ?? null));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  if (!role) return null;

  return (
    <div className="flex items-center gap-2 border-l border-stone-200 pl-3 text-xs text-stone-500">
      <span className="font-medium">{role === "admin" ? "Admin" : "User"}</span>
      <button type="button" onClick={handleLogout} className="rounded-md border border-stone-300 px-2 py-1.5 font-medium text-stone-600 hover:bg-stone-100">Đăng xuất</button>
    </div>
  );
}
