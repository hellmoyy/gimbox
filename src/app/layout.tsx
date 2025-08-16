import type { Metadata } from "next";
import { Geist, Geist_Mono, Rajdhani } from "next/font/google";
import "./globals.css";
import HeaderGate from "../components/HeaderGate";
import RootShell from "../components/RootShell";
import AuthProvider from "../components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Gimbox.id - Topup Game Murah Gercep",
  description: "Topup game murah, cepat, dan terpercaya. Pilihan paket lengkap, pembayaran mudah, layanan gercep.",
  icons: {
    icon: "/images/favicon.png",
    shortcut: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
  applicationName: "Gimbox.id - Topup Game Murah Gercep",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <html lang="id">
    <body
        className={`${geistSans.variable} ${geistMono.variable} ${rajdhani.variable} antialiased`}
        style={{
          backgroundImage: "url(/images/bgbg.webp)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundAttachment: "fixed",
      backgroundPosition: "center",
        }}
      >
    <meta name="theme-color" content="#0d6efd" />
        <AuthProvider>
          {/* Header hidden on admin via HeaderGate */}
          <HeaderGate />
          {/* RootShell renders PWA container for public, desktop for /admin */}
          <RootShell>
            {children}
          </RootShell>
        </AuthProvider>
      </body>
    </html>
  );
}
