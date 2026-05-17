"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/types/database";

export default function EditCategoryRow({ cat }: { cat: Category }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function handleSave() {
    if (name.trim() === cat.name) { setEditing(false); return; }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar");
    }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") { setName(cat.name); setEditing(false); setError(null); }
  }

  if (editing) {
    return (
      <>
        <td className="px-4 py-2" colSpan={2}>
          <div className="flex flex-col gap-1">
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border border-indigo-400 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </td>
        <td className="px-4 py-2 text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "..." : "Guardar"}
            </button>
            <button
              onClick={() => { setName(cat.name); setEditing(false); setError(null); }}
              className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </td>
      </>
    );
  }

  return (
    <>
      <td className="px-4 py-3 font-medium">{cat.name}</td>
      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{cat.slug}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            Editar
          </button>
          <DeleteButton id={cat.id} name={cat.name} />
        </div>
      </td>
    </>
  );
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`¿Eliminar la categoría "${name}"?`)) return;
    setLoading(true);
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-3 py-1 text-xs font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {loading ? "..." : "Eliminar"}
    </button>
  );
}
