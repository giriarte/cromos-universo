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
  const { items, totalPrice, clearForOrder } = useCart();
  const router = useRouter();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [formValues, setFormValues] = useState<FormValues | null>(null);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  if (items.length === 0) {
    router.replace("/cart");
    return null;
  }

  async function onSendCode(values: FormValues) {
    setSending(true);
    setError(null);
    const res = await fetch("/api/verify-email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: values.email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar el código.");
      setSending(false);
      return;
    }
    setFormValues(values);
    setStep("verify");
    setSending(false);
  }

  async function onConfirmOrder() {
    if (!formValues) return;
    if (code.length !== 6) {
      setError("Ingresá el código de 6 dígitos.");
      return;
    }
    setSubmitting(true);
    setError(null);

    // Verify code
    const verifyRes = await fetch("/api/verify-email/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formValues.email, code }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok) {
      setError(verifyData.error ?? "Código incorrecto.");
      setSubmitting(false);
      return;
    }

    // Create order
    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyer: formValues, items }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      setError(orderData.error ?? "Error al procesar el pedido.");
      setSubmitting(false);
      return;
    }

    clearForOrder();
    router.push("/checkout/success");
  }

  async function onResendCode() {
    if (!formValues) return;
    setError(null);
    setSending(true);
    const res = await fetch("/api/verify-email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formValues.email }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "No se pudo reenviar el código.");
    setSending(false);
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {/* Order summary — always visible */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
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

      {step === "form" && (
        <form onSubmit={handleSubmit(onSendCode)} className="flex flex-col gap-6">
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

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

          <button
            type="submit"
            disabled={sending}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sending ? "Enviando código..." : "Enviar código de verificación"}
          </button>
        </form>
      )}

      {step === "verify" && (
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-4">
            <h2 className="font-semibold text-lg">Verificá tu email</h2>
            <p className="text-sm text-gray-600">
              Enviamos un código de 6 dígitos a <strong>{formValues?.email}</strong>. Ingresalo para confirmar tu pedido.
            </p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="text-center text-3xl font-mono tracking-[0.5em] border border-gray-300 rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
            />

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep("form"); setError(null); setCode(""); }}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Cambiar datos
              </button>
              <button
                type="button"
                onClick={onResendCode}
                disabled={sending}
                className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                {sending ? "Enviando..." : "Reenviar código"}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

          <button
            type="button"
            onClick={onConfirmOrder}
            disabled={submitting || code.length !== 6}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Confirmando pedido..." : "Confirmar pedido"}
          </button>
        </div>
      )}
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
