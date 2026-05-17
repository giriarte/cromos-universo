import Link from "next/link";
import Image from "next/image";
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

  // Fetch categories for sidebar
  const { data: catData } = await supabase.from("categories").select("*").order("name");
  const categories = (catData ?? []) as Category[];

  // Resolve category slug → id
  let categoryId: string | null = null;
  let categoryName: string | null = null;
  if (cat) {
    const found = categories.find((c) => c.slug === cat);
    if (found) { categoryId = found.id; categoryName = found.name; }
  }

  // Fetch paginated articles
  let query = supabase
    .from("articles")
    .select("id, title, slug, price, thumbnail_url, stock, status", { count: "exact" })
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, count } = await query;
  const articles = (data ?? []) as Pick<Article, "id" | "title" | "slug" | "price" | "thumbnail_url" | "stock" | "status">[];
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div className="flex gap-6">
      {/* Left sidebar — categories */}
      <aside className="w-48 shrink-0 flex flex-col justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-3">Categorías</p>
          <nav className="flex flex-col gap-1">
            <Link
              href="/"
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                !cat ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Todos
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/?cat=${c.slug}`}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  cat === c.slug ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="px-3 pt-6">
          <Image
            src="/UninversoCromosLogo.png"
            alt="Universo Cromos"
            width={160}
            height={48}
            className="w-full h-auto object-contain"
          />
        </div>
      </aside>

      {/* Center content */}
      <div className="flex-1 min-w-0">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            {page > 1 && (
              <PaginationLink href={buildUrl(cat, page - 1)} label="← Anterior" />
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationLink
                key={p}
                href={buildUrl(cat, p)}
                label={String(p)}
                active={p === page}
              />
            ))}

            {page < totalPages && (
              <PaginationLink href={buildUrl(cat, page + 1)} label="Siguiente →" />
            )}
          </div>
        )}
      </div>
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
