import type { Metadata, Viewport } from "next";
import { IframeBuster } from "@/components/IframeBuster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monitoring Kebersihan PLN UPS",
  description: "Sistem Pemantauan dan Checklist Kebersihan Harian PLN Unit Pelaksana Transmisi (UPS)",
  icons: {
    icon: "https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg",
    apple: "https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0076A8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 selection:bg-pln-blue selection:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <IframeBuster />
        {children}
      </body>
    </html>
  );
}
