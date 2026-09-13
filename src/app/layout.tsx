import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import RegistrarServiceWorker from "@/components/RegistrarServiceWorker";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "LB Caritas — Gestão de Convênios Públicos",
  description: "Sistema de gestão de convênios públicos (Lei 13.019/2014) — LB Assessoria Empresarial",
  // PWA instalável: manifest do Next 15 (App Router) — vira <link rel="manifest">
  // automaticamente no <head>, sem precisar de tag manual.
  manifest: "/manifest.webmanifest",
  // Safari/iOS não lê o manifest.json completo (nada de "display: standalone"
  // via manifest lá) — precisa das meta tags apple-mobile-web-app-* à parte
  // pra abrir em tela cheia quando adicionado à tela de início.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LB Cáritas",
  },
  icons: {
    icon: [
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
