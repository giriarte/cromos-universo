import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { CartItem } from "@/types/database";

export async function POST(req: NextRequest) {
  try {
    const { buyer, items }: { buyer: { name: string; email: string; phone?: string }; items: CartItem[] } =
      await req.json();

    if (!buyer?.name || !buyer?.email || !items?.length) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const total = items.reduce((s, i) => s + i.article.price * i.quantity, 0);

    // Create order (stock was already decremented when items were added to cart)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({ buyer_name: buyer.name, buyer_email: buyer.email, buyer_phone: buyer.phone ?? null, total, status: "pending", expires_at: expiresAt })
      .select()
      .single();

    if (orderError || !order) {
      console.error("[orders POST] insert error:", orderError);
      return NextResponse.json({ error: orderError?.message ?? "Error al crear el pedido" }, { status: 500 });
    }

    // Insert line items
    await supabase.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id,
        article_id: i.article.id,
        quantity: i.quantity,
        unit_price: i.article.price,
      }))
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    console.error("[orders POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
