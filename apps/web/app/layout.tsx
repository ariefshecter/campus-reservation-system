import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Campus Reservation",
  description: "Sistem Reservasi Fasilitas Kampus",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {children}

        {/* GLOBAL TOASTER */}
        <Toaster
          richColors
          position="top-right"
          closeButton
        />
      </body>
    </html>
  );
}
