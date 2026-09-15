import type { Metadata } from "next";
import { Archivo_Black, Plus_Jakarta_Sans } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

/**
 * Archivo Black for headings: a single very heavy weight, which is what gives
 * neobrutalist headlines their poster-like density. It matches the display type
 * used across the brand's Instagram posts.
 */
const archivoBlack = Archivo_Black({
  variable: "--font-heading",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Plus Jakarta Sans for the interface — an Indonesian typeface (Tokotype), so
 * the body text shares its origin with the product's language, and it stays
 * readable at the small sizes tables and forms need.
 */
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tazkia Mengajar Monitoring System",
    template: "%s · Tazkia Mengajar",
  },
  description:
    "Sistem internal untuk mencatat, memantau, dan melaporkan kegiatan Tazkia Mengajar.",
  // Internal administrative tool: it should never show up in search results.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${plusJakarta.variable} ${archivoBlack.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
