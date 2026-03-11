import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { SoundProvider } from "@/components/SoundProvider";

export const metadata: Metadata = {
  title: "MONSTAH!!! Trading Journal | Track, Analyze, Dominate",
  description:
    "Free AI-powered trading journal that helps you track trades, analyze performance, and improve your trading with intelligent insights.",
  keywords:
    "trading journal, trade tracker, AI trading coach, performance analytics",
};

export const viewport: Viewport = {
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
    <html lang="en">
      <body>
        <AuthProvider>
          <SoundProvider>{children}</SoundProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
