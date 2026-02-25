// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google"; // Font bawaan Next.js
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ramadhan Tracker",
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
  manifest: '/site.webmanifest?v=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ramadhan Habits',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Bagus buat PWA biar user ga ga sengaja nge-zoom pas ngetik jurnal
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