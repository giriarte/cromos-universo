import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import type { Article, ArticleImage } from "@/types/database";
import ArticleForm from "@/components/admin/ArticleForm";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("articles")
    .select("*, article_images(*)")
    .eq("id", id)
    .single();

  if (!data) notFound();

  const article = data as Article & { article_images: ArticleImage[] };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Editar artículo</h1>
      <ArticleForm article={article} />
    </div>
  );
}
