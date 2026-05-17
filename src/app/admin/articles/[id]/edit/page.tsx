import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import type { Article, ArticleImage, Category } from "@/types/database";
import ArticleForm from "@/components/admin/ArticleForm";

export const revalidate = 0;

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [{ data }, { data: catData }] = await Promise.all([
    supabase.from("articles").select("*, article_images(*)").eq("id", id).single(),
    supabase.from("categories").select("*").order("name"),
  ]);

  if (!data) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Editar artículo</h1>
      <ArticleForm
        article={data as Article & { article_images: ArticleImage[] }}
        categories={(catData ?? []) as Category[]}
      />
    </div>
  );
}
