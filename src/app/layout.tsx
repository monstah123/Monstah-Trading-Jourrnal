import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "MONSTAH!!! Trading Journal | Track, Analyze, Dominate",
  description:
    "Free AI-powered trading journal that helps you track trades, analyze performance, and improve your trading with intelligent insights.",
  keywords:
    "trading journal, trade tracker, AI trading coach, performance analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
