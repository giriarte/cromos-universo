import Link from "next/link";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";
import DeleteArticleButton from "./DeleteArticleButton";

export const revalidate = 0;

export default async function AdminArticlesPage() {
  const supabase = createServiceClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, slug, price, stock, status, thumbnail_url, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Artículos</h1>
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          + Nuevo artículo
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Imagen</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Título</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Precio</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Stock</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(articles ?? []).map((a) => (
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
        {(!articles || articles.length === 0) && (
          <div className="text-center py-12 text-gray-400 text-sm">No hay artículos todavía.</div>
        )}
      </div>
    </div>
  );
}
