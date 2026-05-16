import { createServiceClient } from "@/lib/supabase";
import DeleteUserButton from "./DeleteUserButton";
import CreateUserForm from "./CreateUserForm";

export const revalidate = 0;

export default async function AdminUsersPage() {
  const supabase = createServiceClient();
  const { data: users } = await supabase
    .from("admin_users")
    .select("id, name, email, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Usuarios administradores</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Rol</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(users ?? []).map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                    u.role === "superadmin" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {u.role === "superadmin" ? "Super Admin" : "Editor"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteUserButton id={u.id} name={u.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!users || users.length === 0) && (
          <div className="text-center py-8 text-gray-400 text-sm">No hay usuarios.</div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold mb-4">Crear nuevo usuario</h2>
        <CreateUserForm />
      </div>
    </div>
  );
}
