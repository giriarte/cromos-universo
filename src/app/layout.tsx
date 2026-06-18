import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cromos Universo",
  description: "Tu tienda de cromos y coleccionables",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geist.className} bg-gray-50 text-gray-900 antialiased`}>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7604664849250140"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
