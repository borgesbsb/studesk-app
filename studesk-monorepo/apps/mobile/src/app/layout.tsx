import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { InstallPWABanner } from "@/components/layout/InstallPWABanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Studesk Mobile",
  description: "Plataforma de estudos otimizada para mobile e tablet",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Studesk",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="application-name" content="Studesk" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Studesk" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={inter.className}>
        <Providers>
          <OfflineBanner />
          <InstallPWABanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
