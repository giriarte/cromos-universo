import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";
import OrderStatusBadge from "./OrderStatusBadge";
import OrderStatusSelect from "./OrderStatusSelect";

export const revalidate = 0;

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

async function cancelExpiredOrders() {
  const supabase = createServiceClient();

  // Find expired pending orders first so we can restore their stock
  const { data: expired } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());

  for (const order of expired ?? []) {
    const { data: items } = await supabase
      .from("order_items")
      .select("article_id, quantity")
      .eq("order_id", order.id);

    for (const item of (items ?? []) as { article_id: string; quantity: number }[]) {
      await supabase.rpc("increment_stock", { article_id: item.article_id, amount: item.quantity });
    }

    await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
  }
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await cancelExpiredOrders();

  const { status: statusFilter } = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from("orders")
    .select("id, buyer_name, buyer_email, total, status, expires_at, created_at")
    .order("created_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: orders } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pedidos</h1>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Filtrar:</span>
          {["", "pending", "confirmed", "cancelled"].map((s) => (
            <a
              key={s}
              href={s ? `?status=${s}` : "?"}
              className={`px-3 py-1 rounded-lg border transition-colors ${
                (statusFilter ?? "") === s
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
              <th className="px-4 py-3 text-left font-medium text-gray-500">Total</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Vence</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(orders ?? []).map((o) => {
              const isExpiringSoon =
                o.status === "pending" &&
                new Date(o.expires_at) < new Date(Date.now() + 24 * 60 * 60 * 1000);

              return (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{o.buyer_name}</p>
                    <p className="text-xs text-gray-400">{o.buyer_email}</p>
                  </td>
                  <td className="px-4 py-3">{formatPrice(Number(o.total))}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.status as string} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${isExpiringSoon ? "text-red-600" : "text-gray-500"}`}>
                      {new Date(o.expires_at).toLocaleDateString("es-AR")}
                      {isExpiringSoon && " ⚠"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                      >
                        Ver detalle
                      </Link>
                      <OrderStatusSelect orderId={o.id} current={o.status as string} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!orders || orders.length === 0) && (
          <div className="text-center py-12 text-gray-400 text-sm">No hay pedidos.</div>
        )}
      </div>
    </div>
  );
}
