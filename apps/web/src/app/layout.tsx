import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AIQ HireFlow",
  description: "Equipment rental, inventory and operations for AIQ Limited",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-aiq-bg text-aiq-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
