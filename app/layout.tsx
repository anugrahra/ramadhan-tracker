// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Font bawaan Next.js
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// ---> INI DIA TEMPAT NGUBAH TITLENYA BRO <---
export const metadata: Metadata = {
  title: "Tracker Ramadhan",
  description: "Pantau ibadah dan tulis jurnal refleksi harianmu.",
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  themeColor: '#10b981', // Warna Emerald khas aplikasi lu, bikin status bar HP Android jadi estetik
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