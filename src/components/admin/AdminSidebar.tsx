"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  HomeIcon,
  PhotoIcon,
  ShoppingBagIcon,
  UsersIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";

const links = [
  { href: "/admin", label: "Dashboard", icon: HomeIcon, exact: true },
  { href: "/admin/articles", label: "Artículos", icon: PhotoIcon, exact: false },
  { href: "/admin/orders", label: "Pedidos", icon: ShoppingBagIcon, exact: false },
  { href: "/admin/users", label: "Usuarios", icon: UsersIcon, exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-5 py-6 border-b border-gray-200">
        <p className="font-bold text-indigo-700 text-sm leading-none">Cromos Universo</p>
        <p className="text-xs text-gray-400 mt-0.5">Admin</p>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
