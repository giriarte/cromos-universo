"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteCategoryButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`¿Eliminar la categoría "${name}"? Los artículos asociados quedarán sin categoría.`)) return;
    setLoading(true);
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-3 py-1 text-xs font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {loading ? "..." : "Eliminar"}
    </button>
  );
}
