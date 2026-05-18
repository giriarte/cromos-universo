"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import type { Article } from "@/types/database";

type Props = {
  article: Pick<Article, "id" | "title" | "slug" | "price" | "thumbnail_url" | "stock" | "waitlist" | "status">;
};

export default function ArticleCard({ article }: Props) {
  const { add, items } = useCart();
  const [loading, setLoading] = useState(false);

  const cartItem = items.find((i) => i.article.id === article.id);
  const inCart = !!cartItem;
  const inCartAsWaitlist = cartItem?.isWaitlist ?? false;
  const outOfStock = article.stock === 0;
  const waitlistAvailable = outOfStock && article.waitlist > 0;
  const fullyUnavailable = outOfStock && article.waitlist === 0;

  async function handleAdd() {
    setLoading(true);
    await add(
      { id: article.id, title: article.title, price: article.price, thumbnail_url: article.thumbnail_url, slug: article.slug, stock: article.stock, waitlist: article.waitlist },
      1,
      waitlistAvailable
    );
    setLoading(false);
  }

  let badgeEl: React.ReactNode = null;
  if (waitlistAvailable) {
    badgeEl = (
      <span className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
        Reservado
      </span>
    );
  } else if (fullyUnavailable) {
    badgeEl = (
      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
        Agotado
      </span>
    );
  }

  let buttonLabel: string;
  let buttonClass: string;
  let buttonDisabled: boolean;

  if (loading) {
    buttonLabel = "Agregando...";
    buttonClass = "bg-gray-300 text-gray-500 cursor-not-allowed";
    buttonDisabled = true;
  } else if (inCart) {
    buttonLabel = inCartAsWaitlist ? "En lista de espera ✓" : "En el carrito ✓";
    buttonClass = "bg-gray-200 text-gray-600 cursor-not-allowed";
    buttonDisabled = true;
  } else if (fullyUnavailable) {
    buttonLabel = "Agotado";
    buttonClass = "bg-gray-200 text-gray-500 cursor-not-allowed";
    buttonDisabled = true;
  } else if (waitlistAvailable) {
    buttonLabel = "Lista de espera";
    buttonClass = "bg-amber-500 text-white hover:bg-amber-600";
    buttonDisabled = false;
  } else {
    buttonLabel = "Agregar al carrito";
    buttonClass = "bg-indigo-600 text-white hover:bg-indigo-700";
    buttonDisabled = false;
  }

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
        {badgeEl}
      </Link>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <Link href={`/article/${article.slug}`} className="font-semibold text-gray-900 hover:text-indigo-700 line-clamp-2 leading-snug">
          {article.title}
        </Link>

        <p className="text-lg font-bold text-indigo-700 mt-auto">{formatPrice(article.price)}</p>

        <div className="relative group/tooltip">
          <button
            disabled={buttonDisabled}
            onClick={handleAdd}
            className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonClass}`}
          >
            {buttonLabel}
          </button>
          {waitlistAvailable && !inCart && (
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-xl bg-gray-900 text-white text-xs leading-snug px-3 py-2 text-center opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 z-10">
              Este artículo está reservado por otro usuario. Podés anotarte en la lista de espera y te avisaremos si queda disponible.
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
