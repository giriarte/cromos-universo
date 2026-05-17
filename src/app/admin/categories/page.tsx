import { createServiceClient } from "@/lib/supabase";
import type { Category } from "@/types/database";
import CreateCategoryForm from "./CreateCategoryForm";
import EditCategoryRow from "./EditCategoryRow";

export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  const categories = (data ?? []) as Category[];

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Categorías</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Slug</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                <EditCategoryRow cat={cat} />
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No hay categorías todavía.</div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold mb-4">Nueva categoría</h2>
        <CreateCategoryForm />
      </div>
    </div>
  );
}
