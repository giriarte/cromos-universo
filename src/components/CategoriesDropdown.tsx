"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { Category } from "@/types/database";

export default function CategoriesDropdown({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const currentCat = searchParams.get("cat");
  const active = categories.find((c) => c.slug === currentCat);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (categories.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 text-sm font-medium transition-colors ${
          active ? "text-indigo-700" : "text-gray-600 hover:text-indigo-700"
        }`}
      >
        {active ? active.name : "Categorías"}
        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 z-50">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className={`block px-4 py-2 text-sm transition-colors ${
              !currentCat ? "text-indigo-700 font-semibold bg-indigo-50" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            Todos
          </Link>
          <div className="my-1 border-t border-gray-100" />
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/?cat=${c.slug}`}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                currentCat === c.slug
                  ? "text-indigo-700 font-semibold bg-indigo-50"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
