import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createServiceClient } from "@/lib/supabase";

const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });

export async function POST(req: NextRequest) {
  const body = await req.json();

  // MercadoPago sends topic=payment for payment notifications
  if (body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ ok: true });
  }

  const payment = await new Payment(mp).get({ id: body.data.id });
  if (!payment || !payment.external_reference) return NextResponse.json({ ok: true });

  const orderId = payment.external_reference;
  const supabase = createServiceClient();

  if (payment.status === "approved") {
    // Mark order as paid and decrement stock
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("article_id, quantity")
      .eq("order_id", orderId);

    await supabase
      .from("orders")
      .update({ status: "paid", mp_payment_id: String(payment.id) })
      .eq("id", orderId);

    for (const item of orderItems ?? []) {
      await supabase.rpc("decrement_stock", { article_id: item.article_id, amount: item.quantity });
    }
  } else if (["rejected", "cancelled"].includes(payment.status ?? "")) {
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
  }

  return NextResponse.json({ ok: true });
}
