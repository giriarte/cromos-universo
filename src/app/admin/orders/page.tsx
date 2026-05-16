import { createServiceClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";
import OrderStatusBadge from "./OrderStatusBadge";
import OrderStatusSelect from "./OrderStatusSelect";

export const revalidate = 0;

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  shipped: "Enviado",
  cancelled: "Cancelado",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createServiceClient();
  let query = supabase
    .from("orders")
    .select("id, buyer_name, buyer_email, total, status, created_at")
    .order("created_at", { ascending: false });

  if (searchParams.status) query = query.eq("status", searchParams.status);

  const { data: orders } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pedidos</h1>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Filtrar:</span>
          {["", "pending", "paid", "shipped", "cancelled"].map((s) => (
            <a
              key={s}
              href={s ? `?status=${s}` : "?"}
              className={`px-3 py-1 rounded-lg border transition-colors ${
                (searchParams.status ?? "") === s
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s ? STATUS_LABELS[s] : "Todos"}
            </a>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Comprador</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Total</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Cambiar estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium">{o.buyer_name}</td>
                <td className="px-4 py-3 text-gray-500">{o.buyer_email}</td>
                <td className="px-4 py-3">{formatPrice(Number(o.total))}</td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={o.status as string} />
                </td>
                <td className="px-4 py-3 text-gray-400">{new Date(o.created_at).toLocaleDateString("es-AR")}</td>
                <td className="px-4 py-3 text-right">
                  <OrderStatusSelect orderId={o.id} current={o.status as string} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!orders || orders.length === 0) && (
          <div className="text-center py-12 text-gray-400 text-sm">No hay pedidos.</div>
        )}
      </div>
    </div>
  );
}
