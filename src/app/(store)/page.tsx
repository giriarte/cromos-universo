import { createServiceClient } from "@/lib/supabase";
import ArticleCard from "@/components/ArticleCard";
import type { Article } from "@/types/database";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, price, thumbnail_url, stock, status")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  const articles = (data ?? []) as Pick<Article, "id" | "title" | "slug" | "price" | "thumbnail_url" | "stock" | "status">[];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Catálogo</h1>
      <p className="text-gray-500 mb-8">Encontrá tus cromos favoritos</p>

      {!articles || articles.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-lg">No hay artículos disponibles por el momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
