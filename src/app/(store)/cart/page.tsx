"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { TrashIcon } from "@heroicons/react/24/outline";

export default function CartPage() {
  const { items, remove, updateQty, totalPrice } = useCart();
  const [busy, setBusy] = useState<string | null>(null); // articleId currently being updated

  if (items.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-2xl font-semibold text-gray-400 mb-4">Tu carrito está vacío</p>
        <Link href="/" className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
          Ver catálogo
        </Link>
      </div>
    );
  }

  async function handleRemove(articleId: string) {
    setBusy(articleId);
    await remove(articleId);
    setBusy(null);
  }

  async function handleQty(articleId: string, newQty: number, currentQty: number) {
    if (newQty < 1) {
      await handleRemove(articleId);
      return;
    }
    setBusy(articleId);
    await updateQty(articleId, newQty);
    setBusy(null);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Tu carrito</h1>

      <div className="flex flex-col gap-4 mb-8">
        {items.map(({ article, quantity }) => {
          const isBusy = busy === article.id;
          return (
            <div key={article.id} className={`flex gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm transition-opacity ${isBusy ? "opacity-60 pointer-events-none" : ""}`}>
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {article.thumbnail_url ? (
                  <Image src={article.thumbnail_url} alt={article.title} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Sin img</div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1">
                <Link href={`/article/${article.slug}`} className="font-semibold hover:text-indigo-700 line-clamp-1">
                  {article.title}
                </Link>
                <p className="text-indigo-700 font-bold">{formatPrice(article.price)}</p>

                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => handleQty(article.id, quantity - 1, quantity)}
                    className="w-7 h-7 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center font-semibold"
                  >
                    -
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                  <button
                    onClick={() => handleQty(article.id, quantity + 1, quantity)}
                    disabled={quantity >= article.stock}
                    className="w-7 h-7 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center font-semibold disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-end justify-between">
                <button onClick={() => handleRemove(article.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <TrashIcon className="h-5 w-5" />
                </button>
                <p className="text-sm font-semibold text-gray-700">{formatPrice(article.price * quantity)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <span className="text-gray-600">Total</span>
          <span className="text-2xl font-bold text-indigo-700">{formatPrice(totalPrice)}</span>
        </div>
        <Link
          href="/checkout"
          className="block w-full text-center py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Ir al checkout
        </Link>
      </div>
    </div>
  );
}
