import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";
import OrderStatusBadge from "../OrderStatusBadge";
import OrderDetailActions from "./OrderDetailActions";

export const revalidate = 0;

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("*, articles(id, title, thumbnail_url, slug)")
    .eq("order_id", id);

  const orderItems = (items ?? []) as {
    id: string;
    quantity: number;
    unit_price: number;
    articles: { id: string; title: string; thumbnail_url: string | null; slug: string } | null;
  }[];

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/orders"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Pedidos
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-500 font-mono">{order.id.slice(0, 8)}…</span>
      </div>

      <h1 className="text-2xl font-bold mb-6">Detalle del pedido</h1>

      {/* Buyer info */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <h2 className="font-semibold mb-4">Datos del comprador</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Detail label="Nombre" value={order.buyer_name} />
          <Detail label="Email" value={order.buyer_email} />
          {order.buyer_phone && <Detail label="Teléfono" value={order.buyer_phone} />}
          <Detail label="Fecha" value={new Date(order.created_at).toLocaleString("es-AR")} />
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <h2 className="font-semibold mb-4">Artículos</h2>
        <div className="flex flex-col gap-3">
          {orderItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {item.articles?.thumbnail_url ? (
                  <Image
                    src={item.articles.thumbnail_url}
                    alt={item.articles.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">–</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{item.articles?.title ?? "Artículo eliminado"}</p>
                <p className="text-xs text-gray-400">
                  {item.quantity} × {formatPrice(Number(item.unit_price))}
                </p>
              </div>
              <p className="text-sm font-semibold shrink-0">
                {formatPrice(Number(item.unit_price) * item.quantity)}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between font-bold">
          <span>Total</span>
          <span className="text-indigo-700">{formatPrice(Number(order.total))}</span>
        </div>
      </div>

      {/* Status & expiration — editable */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold mb-4">Estado y vencimiento</h2>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-600">Estado actual:</span>
          <OrderStatusBadge status={order.status} />
        </div>
        <OrderDetailActions
          orderId={order.id}
          currentStatus={order.status}
          currentExpiresAt={order.expires_at}
        />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
