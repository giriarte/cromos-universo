"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { Article } from "@/types/database";

type Props = { article: Pick<Article, "id" | "title" | "price" | "thumbnail_url" | "slug" | "stock"> };

export default function AddToCartButton({ article }: Props) {
  const { add, items } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inCart = items.some((i) => i.article.id === article.id);
  const outOfStock = article.stock === 0;

  async function handleAdd() {
    setLoading(true);
    setError(null);
    const result = await add(article);
    if (!result.ok) {
      setError(result.error ?? "Sin stock disponible");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        disabled={outOfStock || inCart || loading}
        onClick={handleAdd}
        className="w-full py-3 rounded-xl text-base font-semibold transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Agregando..." : inCart ? "En el carrito ✓" : outOfStock ? "Sin stock" : "Agregar al carrito"}
      </button>
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
    </div>
  );
}
