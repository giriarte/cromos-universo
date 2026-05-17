"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  HomeIcon,
  PhotoIcon,
  ShoppingBagIcon,
  UsersIcon,
  TagIcon,
  ChevronDownIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";

const links = [
  { href: "/admin", label: "Dashboard", icon: HomeIcon, exact: true },
  { href: "/admin/articles", label: "Artículos", icon: PhotoIcon, exact: false },
  { href: "/admin/categories", label: "Categorías", icon: TagIcon, exact: false },
  { href: "/admin/orders", label: "Pedidos", icon: ShoppingBagIcon, exact: false },
  { href: "/admin/users", label: "Usuarios", icon: UsersIcon, exact: false },
];

export default function AdminHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = links.find(({ href, exact }) =>
    exact ? pathname === href : pathname.startsWith(href)
  ) ?? links[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-6">

        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-indigo-700 text-sm">Cromos Universo</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Admin</span>
        </div>

        {/* Nav dropdown */}
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-700 transition-colors"
          >
            <active.icon className="h-4 w-4" />
            {active.label}
            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 z-50">
              {links.map(({ href, label, icon: Icon, exact }) => {
                const isActive = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? "text-indigo-700 font-semibold bg-indigo-50"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors shrink-0"
        >
          <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
          Salir
        </button>
      </div>
    </header>
  );
}
