import { notFound } from "next/navigation";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";
import type { Article, ArticleImage } from "@/types/database";
import AddToCartButton from "./AddToCartButton";
import ImageGallery from "./ImageGallery";

export const revalidate = 60;

export async function generateStaticParams() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("articles").select("slug").eq("status", "active");
  return ((data ?? []) as { slug: string }[]).map((a) => ({ slug: a.slug }));
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("articles")
    .select("*, article_images(*)")
    .eq("slug", slug)
    .single();

  if (!data) notFound();

  const article = data as Article & { article_images: ArticleImage[] };
  const images = article.article_images ?? [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid md:grid-cols-2 gap-10">
        <div>
          {images.length > 1 ? (
            <ImageGallery
              thumbnail={article.thumbnail_url}
              images={images.map((i) => i.url)}
              title={article.title}
            />
          ) : (
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
              {article.thumbnail_url ? (
                <Image src={article.thumbnail_url} alt={article.title} fill className="object-contain p-2" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">Sin imagen</div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold leading-snug">{article.title}</h1>
          <p className="text-3xl font-bold text-indigo-700">{formatPrice(article.price)}</p>

          {article.description && (
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{article.description}</p>
          )}

          <div className="mt-2">
            {article.stock > 0 ? (
              <p className="text-sm text-green-600 font-medium mb-4">
                {article.stock === 1 ? "¡Último disponible!" : `${article.stock} disponibles`}
              </p>
            ) : article.waitlist > 0 ? (
              <p className="text-sm text-amber-600 font-medium mb-4">
                Sin stock — {article.waitlist} lugar{article.waitlist === 1 ? "" : "es"} en lista de espera
              </p>
            ) : (
              <p className="text-sm text-red-500 font-medium mb-4">Sin stock</p>
            )}

            <AddToCartButton article={article} />
          </div>
        </div>
      </div>
    </div>
  );
}
