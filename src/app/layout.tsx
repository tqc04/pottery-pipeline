import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pottery Pipeline — Hệ thống điều phối xưởng gốm",
  description: "Quản lý pipeline sản xuất gốm sứ với AI, Kanban và Telegram alerts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 text-stone-800 antialiased">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
