import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import ArticleCard from "@/components/ArticleCard";
import HeroSection from "@/components/HeroSection";
import type { Article, Category } from "@/types/database";

export const revalidate = 60;

const PER_PAGE = 10;
const HOME_PER_SECTION = 6;

type ArticleRow = Pick<
  Article,
  "id" | "title" | "slug" | "price" | "thumbnail_url" | "stock" | "waitlist" | "status"
>;
type CategoryRow = Pick<Category, "id" | "slug" | "name">;

// ── Accent palette ────────────────────────────────────────────────────────────

type Accent = "indigo" | "orange" | "green" | "violet" | "amber" | "teal" | "rose" | "slate";

const ACCENT_STYLES: Record<
  Accent,
  { bar: string; btn: string }
> = {
  indigo: { bar: "bg-indigo-500",  btn: "border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white" },
  orange: { bar: "bg-orange-500",  btn: "border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white" },
  green:  { bar: "bg-emerald-500", btn: "border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white" },
  violet: { bar: "bg-violet-500",  btn: "border-violet-600 text-violet-700 hover:bg-violet-600 hover:text-white" },
  amber:  { bar: "bg-amber-500",   btn: "border-amber-500 text-amber-700 hover:bg-amber-500 hover:text-white" },
  teal:   { bar: "bg-teal-500",    btn: "border-teal-600 text-teal-700 hover:bg-teal-600 hover:text-white" },
  rose:   { bar: "bg-rose-500",    btn: "border-rose-600 text-rose-700 hover:bg-rose-600 hover:text-white" },
  slate:  { bar: "bg-slate-400",   btn: "border-slate-500 text-slate-600 hover:bg-slate-500 hover:text-white" },
};

// Rotation for categories that aren't one of the 3 featured ones
const EXTRA_PALETTE: Accent[] = ["violet", "amber", "teal", "rose", "slate"];

function accentFor(slug: string, extraIndex: number): Accent {
  if (slug.includes("mundial")) return "indigo";
  if (slug.includes("moneda"))  return "orange";
  if (slug.includes("estampilla")) return "green";
  return EXTRA_PALETTE[extraIndex % EXTRA_PALETTE.length];
}

// ── Data helpers ──────────────────────────────────────────────────────────────

const SELECT =
  "id, title, slug, price, thumbnail_url, stock, waitlist, status";

async function fetchCat(
  supabase: ReturnType<typeof createServiceClient>,
  categoryId: string,
  limit: number,
  offset = 0
): Promise<{ articles: ArticleRow[]; count: number }> {
  const { data, count } = await supabase
    .from("articles")
    .select(SELECT, { count: "exact" })
    .eq("status", "active")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return { articles: (data ?? []) as ArticleRow[], count: count ?? 0 };
}

async function fetchOtras(
  supabase: ReturnType<typeof createServiceClient>,
  limit: number,
  offset = 0
): Promise<{ articles: ArticleRow[]; count: number }> {
  const { data, count } = await supabase
    .from("articles")
    .select(SELECT, { count: "exact" })
    .eq("status", "active")
    .is("category_id", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return { articles: (data ?? []) as ArticleRow[], count: count ?? 0 };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; page?: string }>;
}) {
  const { cat, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1"));

  const supabase = createServiceClient();

  const { data: catData } = await supabase
    .from("categories")
    .select("id, slug, name")
    .order("name");
  const allCats = (catData ?? []) as CategoryRow[];

  // ── Home view ──────────────────────────────────────────────────────────────
  if (!cat) {
    // 1. mundial first
    const mundialCat = allCats.find(
      (c) => c.slug.includes("mundial") || c.name.toLowerCase().includes("mundial")
    );
    // 2. everything else, alphabetical (DB already ordered by name)
    const middleCats = allCats.filter((c) => c !== mundialCat);
    // 3. ordered list for rendering
    const orderedCats = mundialCat ? [mundialCat, ...middleCats] : middleCats;

    // Fetch all category sections + uncategorized in parallel
    const [catResults, otras] = await Promise.all([
      Promise.all(orderedCats.map((c) => fetchCat(supabase, c.id, HOME_PER_SECTION))),
      fetchOtras(supabase, HOME_PER_SECTION),
    ]);

    // Assign colors
    let extraIdx = 0;
    const sections = orderedCats.map((c, i) => {
      const accent = accentFor(c.slug, extraIdx);
      if (!["mundial", "moneda", "estampilla"].some((kw) => c.slug.includes(kw))) extraIdx++;
      return { key: c.id, title: c.name, verMasHref: `/?cat=${c.slug}`, accent, ...catResults[i] };
    });

    return (
      <>
        <HeroSection />
        <div id="catalogo" className="max-w-7xl mx-auto px-4 py-12 space-y-14">
          {sections.map((s) => (
            <HomeSection
              key={s.key}
              title={s.title}
              articles={s.articles}
              total={s.count}
              verMasHref={s.verMasHref}
              accent={s.accent}
            />
          ))}

          {/* "Otras" only when there are uncategorized articles */}
          {otras.count > 0 && (
            <HomeSection
              key="otras"
              title="Otras"
              articles={otras.articles}
              total={otras.count}
              verMasHref="/?cat=otras"
              accent="slate"
            />
          )}
        </div>
      </>
    );
  }

  // ── Filtered category view ─────────────────────────────────────────────────
  const isOtras = cat === "otras";
  const from = (page - 1) * PER_PAGE;

  const foundCat = isOtras ? null : allCats.find((c) => c.slug === cat);
  const categoryName = isOtras ? "Otras" : (foundCat?.name ?? "Catálogo");

  const { articles, count } = isOtras
    ? await fetchOtras(supabase, PER_PAGE, from)
    : await fetchCat(supabase, foundCat?.id ?? "", PER_PAGE, from);

  const totalPages = Math.ceil(count / PER_PAGE);

  return (
    <div id="catalogo" className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-indigo-600 transition-colors mb-1 inline-block"
        >
          ← Inicio
        </Link>
        <h1 className="text-2xl font-bold">{categoryName}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {count} {count === 1 ? "artículo" : "artículos"}
        </p>
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
          {page > 1 && <PaginationLink href={buildUrl(cat, page - 1)} label="← Anterior" />}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <PaginationLink key={p} href={buildUrl(cat, p)} label={String(p)} active={p === page} />
          ))}
          {page < totalPages && <PaginationLink href={buildUrl(cat, page + 1)} label="Siguiente →" />}
        </div>
      )}
    </div>
  );
}

// ── HomeSection ───────────────────────────────────────────────────────────────

function HomeSection({
  title,
  articles,
  total,
  verMasHref,
  accent,
}: {
  title: string;
  articles: ArticleRow[];
  total: number;
  verMasHref: string;
  accent: Accent;
}) {
  const { bar, btn } = ACCENT_STYLES[accent];
  const remaining = total - articles.length;

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <span className={`w-1 h-7 rounded-full flex-shrink-0 ${bar}`} />
        <h2 className="text-xl font-bold text-gray-900 flex-1">{title}</h2>
        <span className="text-sm text-gray-400">{total} artículos</span>
      </div>

      {articles.length === 0 ? (
        <p className="text-gray-400 text-sm py-6">No hay artículos disponibles.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {total > HOME_PER_SECTION && (
        <div className="mt-6 flex justify-center">
          <Link
            href={verMasHref}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${btn}`}
          >
            Ver los {remaining} artículos restantes
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      <div className="mt-14 border-t border-gray-100" />
    </section>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUrl(cat: string | undefined, page: number) {
  const params = new URLSearchParams();
  if (cat) params.set("cat", cat);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function PaginationLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
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
