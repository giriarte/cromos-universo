import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
