"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { Article } from "@/types/database";

type Props = {
  article: Pick<Article, "id" | "title" | "price" | "thumbnail_url" | "slug" | "stock" | "waitlist">;
};

export default function AddToCartButton({ article }: Props) {
  const { add, items } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartItem = items.find((i) => i.article.id === article.id);
  const inCart = !!cartItem;
  const inCartAsWaitlist = cartItem?.isWaitlist ?? false;
  const outOfStock = article.stock === 0;
  const waitlistFull = article.waitlist === 0;

  async function handleAdd(isWaitlist: boolean) {
    setLoading(true);
    setError(null);
    const result = await add(article, 1, isWaitlist);
    if (!result.ok) {
      setError(result.error ?? (isWaitlist ? "Lista de espera llena" : "Sin stock disponible"));
    }
    setLoading(false);
  }

  if (inCart) {
    return (
      <button
        disabled
        className="w-full py-3 rounded-xl text-base font-semibold bg-gray-200 text-gray-600 cursor-not-allowed"
      >
        {inCartAsWaitlist ? "En lista de espera ✓" : "En el carrito ✓"}
      </button>
    );
  }

  if (!outOfStock) {
    return (
      <div className="flex flex-col gap-2">
        <button
          disabled={loading}
          onClick={() => handleAdd(false)}
          className="w-full py-3 rounded-xl text-base font-semibold transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Agregando..." : "Agregar al carrito"}
        </button>
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>
    );
  }

  if (!waitlistFull) {
    return (
      <div className="flex flex-col gap-2">
        <button
          disabled={loading}
          onClick={() => handleAdd(true)}
          className="w-full py-3 rounded-xl text-base font-semibold transition-colors bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Agregando..."
            : `Lista de espera (${article.waitlist} lugar${article.waitlist === 1 ? "" : "es"})`}
        </button>
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>
    );
  }

  return (
    <button
      disabled
      className="w-full py-3 rounded-xl text-base font-semibold bg-gray-200 text-gray-500 cursor-not-allowed"
    >
      Sin stock
    </button>
  );
}
