import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { articleId, amount, direction } = body;

  if (!articleId || typeof amount !== "number" || amount <= 0 || !Number.isInteger(amount)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }
  if (direction !== "decrement" && direction !== "increment") {
    return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (direction === "decrement") {
    const { data } = await supabase.from("articles").select("stock").eq("id", articleId).single();
    const available = data?.stock ?? 0;
    if (available < amount) {
      return NextResponse.json({ error: "Sin stock suficiente", available }, { status: 409 });
    }
    await supabase.rpc("decrement_stock", { article_id: articleId, amount });
  } else {
    await supabase.rpc("increment_stock", { article_id: articleId, amount });
  }

  return NextResponse.json({ ok: true });
}
