"use client";

import { useRouter } from "next/navigation";
import type { Category } from "@/types/database";

export default function CategoryFilter({
  categories,
  selected,
}: {
  categories: Category[];
  selected: string;
}) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    router.push(val ? `/admin/articles?cat=${val}` : "/admin/articles");
  }

  return (
    <select
      value={selected}
      onChange={handleChange}
      className="text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">Todas las categorías</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
