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
  title: "TokoSaya - Top Up Game",
  description: "Website top-up game terpercaya di Indonesia",
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
