"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import RoleSwitcher from "@/components/RoleSwitcher";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/kanban", label: "Kanban" },
  { href: "/orders/new", label: "Tạo đơn" },
  { href: "/account", label: "Tài khoản" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-amber-200/60 bg-white/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🏺</span>
            <span className="font-bold text-amber-900 text-lg">
              Pottery Pipeline
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-amber-100 text-amber-900"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <RoleSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
}
