import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Panorama Semanal — Planejamento",
  description: "Panorama semanal de indicadores de planejamento — Estaleiro Mauá",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={cn("h-full", inter.className, "font-sans")}>
      <body className="min-h-full bg-surface text-text">{children}</body>
    </html>
  );
}
