import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { Toaster } from "@/components/ui/sonner";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "MyPrint.pt - Sistema de Orçamentos",
  description: "Sistema de orçamentos para impressão digital",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={`${nunito.variable} font-sans antialiased`} suppressHydrationWarning>
        <Navigation />
        <main className="min-h-screen bg-[#F6EEE8]">
          {children}
        </main>
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
