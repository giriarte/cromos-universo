"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "paid", label: "Pagado" },
  { value: "shipped", label: "Enviado" },
  { value: "cancelled", label: "Cancelado" },
];

export default function OrderStatusSelect({ orderId, current }: { orderId: string; current: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLoading(true);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: e.target.value }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <select
      defaultValue={current}
      onChange={handleChange}
      disabled={loading}
      className="text-xs rounded-lg border border-gray-300 px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
