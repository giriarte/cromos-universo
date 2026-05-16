const COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  shipped: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-600",
};
const LABELS: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  shipped: "Enviado",
  cancelled: "Cancelado",
};

export default function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${COLORS[status] ?? "bg-gray-100 text-gray-500"}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
