"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import type { Article } from "@/types/database";

type Props = {
  article: Pick<Article, "id" | "title" | "slug" | "price" | "thumbnail_url" | "stock" | "status">;
};

export default function ArticleCard({ article }: Props) {
  const { add, items } = useCart();
  const inCart = items.some((i) => i.article.id === article.id);
  const outOfStock = article.stock === 0;

  return (
    <div className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <Link href={`/article/${article.slug}`} className="block relative aspect-square bg-gray-100">
        {article.thumbnail_url ? (
          <Image
            src={article.thumbnail_url}
            alt={article.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-2"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Sin imagen</div>
        )}
        {outOfStock && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            Agotado
          </span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <Link href={`/article/${article.slug}`} className="font-semibold text-gray-900 hover:text-indigo-700 line-clamp-2 leading-snug">
          {article.title}
        </Link>

        <p className="text-lg font-bold text-indigo-700 mt-auto">{formatPrice(article.price)}</p>

        <button
          disabled={outOfStock || inCart}
          onClick={() => add({ id: article.id, title: article.title, price: article.price, thumbnail_url: article.thumbnail_url, slug: article.slug, stock: article.stock })}
          className="w-full py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500"
        >
          {outOfStock ? "Agotado" : inCart ? "En el carrito" : "Agregar al carrito"}
        </button>
      </div>
    </div>
  );
}
