// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Font bawaan Next.js
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// ---> INI DIA TEMPAT NGUBAH TITLENYA BRO <---
export const metadata: Metadata = {
  title: "Ramadhan Tracker",
  description: "Pantau progres ibadah wajib dan sunnah harianmu selama bulan suci Ramadhan.",
  icons: {
    icon: 'https://fav.farm/🕌', // Kalau lu punya logo, bisa diset di sini nanti
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Ubah lang="en" jadi lang="id" biar Google tau ini web berbahasa Indonesia
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  );
}