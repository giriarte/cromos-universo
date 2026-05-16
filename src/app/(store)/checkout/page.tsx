"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Ingresá tu nombre completo"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CheckoutPage() {
  const { items, totalPrice, clear } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  if (items.length === 0) {
    router.replace("/cart");
    return null;
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyer: values, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al procesar el pedido");

      clear();
      window.location.href = data.init_point;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-4">
          <h2 className="font-semibold text-lg">Tus datos</h2>

          <Field label="Nombre completo" error={errors.name?.message}>
            <input {...register("name")} className={inputClass(!!errors.name)} placeholder="Juan García" />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <input {...register("email")} type="email" className={inputClass(!!errors.email)} placeholder="juan@email.com" />
          </Field>

          <Field label="Teléfono (opcional)" error={errors.phone?.message}>
            <input {...register("phone")} type="tel" className={inputClass(false)} placeholder="+54 9 11 1234-5678" />
          </Field>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Tu pedido</h2>
          <div className="flex flex-col gap-2 text-sm text-gray-600">
            {items.map(({ article, quantity }) => (
              <div key={article.id} className="flex justify-between">
                <span className="line-clamp-1 flex-1 mr-4">{article.title} x{quantity}</span>
                <span className="font-medium shrink-0">{formatPrice(article.price * quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-indigo-700">{formatPrice(totalPrice)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Procesando..." : "Pagar con MercadoPago"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition ${
    hasError ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
  }`;
}
