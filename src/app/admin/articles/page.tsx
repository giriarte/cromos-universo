import Link from "next/link";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";
import type { Category } from "@/types/database";
import DeleteArticleButton from "./DeleteArticleButton";
import CategoryFilter from "./CategoryFilter";

export const revalidate = 0;

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const supabase = createServiceClient();

  const [{ data: catData }, articlesResult] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    (() => {
      let q = supabase
        .from("articles")
        .select("id, title, slug, price, stock, status, thumbnail_url, created_at, category_id")
        .order("created_at", { ascending: false });
      if (cat) q = q.eq("category_id", cat);
      return q;
    })(),
  ]);

  const categories = (catData ?? []) as Category[];
  const articles = articlesResult.data ?? [];

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Artículos</h1>
        <div className="flex items-center gap-3">
          <CategoryFilter categories={categories} selected={cat ?? ""} />
          <Link
            href="/admin/articles/new"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            + Nuevo artículo
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Imagen</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Título</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Categoría</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Precio</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Stock</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {articles.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
                    {a.thumbnail_url ? (
                      <Image src={a.thumbnail_url} alt={a.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">–</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium max-w-xs">
                  <span className="line-clamp-1">{a.title}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {a.category_id ? categoryMap[a.category_id] ?? "–" : "–"}
                </td>
                <td className="px-4 py-3">{formatPrice(Number(a.price))}</td>
                <td className="px-4 py-3">{a.stock}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                    a.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {a.status === "active" ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/articles/${a.id}/edit`}
                      className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      Editar
                    </Link>
                    <DeleteArticleButton id={a.id} title={a.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {articles.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            {cat ? "No hay artículos en esta categoría." : "No hay artículos todavía."}
          </div>
        )}
      </div>
    </div>
  );
}
