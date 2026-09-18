import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bungee, Inter } from "next/font/google";
import "./globals.css";

const bungee = Bungee({
  weight: "400",
  variable: "--font-bungee",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Object Royale",
  description: "Photograph your surroundings. Make everything fight.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a12",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${bungee.variable} ${inter.variable}`}>
      <body>
        <main className="mx-auto min-h-dvh w-full max-w-[430px] px-4 no-select pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          {children}
        </main>
      </body>
    </html>
  );
}
