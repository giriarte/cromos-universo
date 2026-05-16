"use client";

import { useCart } from "@/context/CartContext";
import type { Article } from "@/types/database";

type Props = { article: Pick<Article, "id" | "title" | "price" | "thumbnail_url" | "slug" | "stock"> };

export default function AddToCartButton({ article }: Props) {
  const { add, items } = useCart();
  const inCart = items.some((i) => i.article.id === article.id);
  const outOfStock = article.stock === 0;

  return (
    <button
      disabled={outOfStock || inCart}
      onClick={() => add(article)}
      className="w-full py-3 rounded-xl text-base font-semibold transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {outOfStock ? "Sin stock" : inCart ? "En el carrito ✓" : "Agregar al carrito"}
    </button>
  );
}
