import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Investa - Aprenda a Investir",
  description:
    "Plataforma educacional que ensina voce a investir do zero. Aprenda, acompanhe o mercado e planeje seu futuro financeiro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} antialiased`}>
        <Navbar />
        <main className="md:ml-64 min-h-screen pb-20 md:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}
