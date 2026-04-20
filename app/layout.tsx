import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/AuthProvider";

const dmSans = DM_Sans({
  variable: "--font-dm",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "IELTS Vocab — 雅思词汇",
  description: "优雅高效的雅思词汇学习工具",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${dmSans.variable} ${instrumentSerif.variable}`}>
      <body><ClientProviders>{children}</ClientProviders></body>
    </html>
  );
}
