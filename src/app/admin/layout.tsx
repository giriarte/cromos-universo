import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminHeader from "@/components/admin/AdminHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";

  if (pathname !== "/admin/login") {
    const session = await auth();
    if (!session) redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
