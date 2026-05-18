import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import ArticleCard from "@/components/ArticleCard";
import type { Article, Category } from "@/types/database";

export const revalidate = 60;

const PER_PAGE = 10;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; page?: string }>;
}) {
  const { cat, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1"));
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const supabase = createServiceClient();

  // Resolve category slug → id (reuse categories already fetched by layout for the dropdown)
  const { data: catData } = await supabase.from("categories").select("id, slug, name").order("name");
  const categories = (catData ?? []) as Pick<Category, "id" | "slug" | "name">[];

  let categoryId: string | null = null;
  let categoryName: string | null = null;
  if (cat) {
    const found = categories.find((c) => c.slug === cat);
    if (found) { categoryId = found.id; categoryName = found.name; }
  }

  let query = supabase
    .from("articles")
    .select("id, title, slug, price, thumbnail_url, stock, waitlist, status", { count: "exact" })
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, count } = await query;
  const articles = (data ?? []) as Pick<Article, "id" | "title" | "slug" | "price" | "thumbnail_url" | "stock" | "waitlist" | "status">[];
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{categoryName ?? "Catálogo"}</h1>
          {count !== null && (
            <p className="text-sm text-gray-400 mt-0.5">
              {count} {count === 1 ? "artículo" : "artículos"}
            </p>
          )}
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p>No hay artículos en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-10">
          {page > 1 && (
            <PaginationLink href={buildUrl(cat, page - 1)} label="← Anterior" />
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <PaginationLink key={p} href={buildUrl(cat, p)} label={String(p)} active={p === page} />
          ))}
          {page < totalPages && (
            <PaginationLink href={buildUrl(cat, page + 1)} label="Siguiente →" />
          )}
        </div>
      )}
    </div>
  );
}

function buildUrl(cat: string | undefined, page: number) {
  const params = new URLSearchParams();
  if (cat) params.set("cat", cat);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function PaginationLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "border-gray-300 text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </Link>
  );
}
