import { createServiceClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";

export const revalidate = 60;

async function getStats() {
  const supabase = createServiceClient();
  const [{ count: articleCount }, { count: orderCount }, { data: revenue }, { data: pendingOrders }] =
    await Promise.all([
      supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("total").eq("status", "paid"),
      supabase.from("orders").select("id, buyer_name, total, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
    ]);

  const totalRevenue = (revenue ?? []).reduce((s, o) => s + Number(o.total), 0);
  return { articleCount: articleCount ?? 0, orderCount: orderCount ?? 0, totalRevenue, pendingOrders: pendingOrders ?? [] };
}

export default async function AdminDashboard() {
  const { articleCount, orderCount, totalRevenue, pendingOrders } = await getStats();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Artículos activos" value={String(articleCount)} />
        <StatCard label="Pedidos totales" value={String(orderCount)} />
        <StatCard label="Ingresos cobrados" value={formatPrice(totalRevenue)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold mb-4">Pedidos pendientes recientes</h2>
        {pendingOrders.length === 0 ? (
          <p className="text-sm text-gray-400">No hay pedidos pendientes.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="pb-2 font-medium">Comprador</th>
                <th className="pb-2 font-medium">Total</th>
                <th className="pb-2 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingOrders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2">{o.buyer_name}</td>
                  <td className="py-2">{formatPrice(Number(o.total))}</td>
                  <td className="py-2 text-gray-400">{new Date(o.created_at).toLocaleDateString("es-AR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
