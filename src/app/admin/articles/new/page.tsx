import { createServiceClient } from "@/lib/supabase";
import type { Category } from "@/types/database";
import ArticleForm from "@/components/admin/ArticleForm";

export default async function NewArticlePage() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  const categories = (data ?? []) as Category[];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nuevo artículo</h1>
      <ArticleForm categories={categories} />
    </div>
  );
}
