"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";

export default function Header() {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/UninversoCromosLogo.png"
            alt="Universo Cromos"
            width={180}
            height={48}
            className="h-12 w-auto object-contain"
            priority
          />
          <span className="text-2xl font-bold text-indigo-700 tracking-tight">Universo Cromos</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-indigo-700 transition-colors">
            Catálogo
          </Link>
          <Link href="/cart" className="relative p-2 text-gray-600 hover:text-indigo-700 transition-colors">
            <ShoppingCartIcon className="h-6 w-6" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
