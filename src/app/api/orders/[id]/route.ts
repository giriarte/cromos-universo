import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const validStatuses = ["pending", "confirmed", "cancelled"];
  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    update.status = body.status;
  }

  if (body.expires_at !== undefined) {
    update.expires_at = body.expires_at;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No hay cambios" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Restore stock only when transitioning into "cancelled" from a non-cancelled status
  if (update.status === "cancelled") {
    const { data: current } = await supabase
      .from("orders")
      .select("status")
      .eq("id", id)
      .single();

    if (current && current.status !== "cancelled") {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("article_id, quantity, is_waitlist")
        .eq("order_id", id);

      for (const item of (orderItems ?? []) as { article_id: string; quantity: number; is_waitlist: boolean }[]) {
        if (item.is_waitlist) {
          await supabase.rpc("increment_waitlist", { article_id: item.article_id, amount: item.quantity });
        } else {
          await supabase.rpc("increment_stock", { article_id: item.article_id, amount: item.quantity });
        }
      }
    }
  }

  const { error } = await supabase.from("orders").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
