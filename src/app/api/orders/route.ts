import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createServiceClient } from "@/lib/supabase";
import type { CartItem } from "@/types/database";

const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });

export async function POST(req: NextRequest) {
  const { buyer, items }: { buyer: { name: string; email: string; phone?: string }; items: CartItem[] } =
    await req.json();

  if (!buyer?.name || !buyer?.email || !items?.length) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify stock for all items
  for (const { article, quantity } of items) {
    const { data } = await supabase.from("articles").select("stock").eq("id", article.id).single();
    if (!data || data.stock < quantity) {
      return NextResponse.json({ error: `Sin stock suficiente para "${article.title}"` }, { status: 409 });
    }
  }

  const total = items.reduce((s, i) => s + i.article.price * i.quantity, 0);

  // Create order in DB
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_name: buyer.name,
      buyer_email: buyer.email,
      buyer_phone: buyer.phone ?? null,
      total,
      status: "pending",
    })
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Error creando pedido" }, { status: 500 });
  }

  // Insert order items
  await supabase.from("order_items").insert(
    items.map((i) => ({
      order_id: order.id,
      article_id: i.article.id,
      quantity: i.quantity,
      unit_price: i.article.price,
    }))
  );

  // Create MercadoPago preference
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const preference = await new Preference(mp).create({
    body: {
      external_reference: order.id,
      payer: { name: buyer.name, email: buyer.email },
      items: items.map((i) => ({
        id: i.article.id,
        title: i.article.title,
        quantity: i.quantity,
        unit_price: i.article.price,
        currency_id: "ARS",
      })),
      back_urls: {
        success: `${baseUrl}/checkout/success`,
        failure: `${baseUrl}/checkout/failure`,
        pending: `${baseUrl}/checkout/success`,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/mp-webhook`,
    },
  });

  // Save MP preference ID
  await supabase.from("orders").update({ mp_preference_id: preference.id }).eq("id", order.id);

  return NextResponse.json({ init_point: preference.init_point }, { status: 201 });
}
