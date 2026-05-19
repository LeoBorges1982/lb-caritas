import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "LB Caritas — Gestão de Convênios Públicos",
  description: "Sistema de gestão de convênios públicos (Lei 13.019/2014) — LB Assessoria Empresarial",
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
