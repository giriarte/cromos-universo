import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { articleId, amount, direction, field = "stock" } = body;

  if (!articleId || typeof amount !== "number" || amount <= 0 || !Number.isInteger(amount)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }
  if (direction !== "decrement" && direction !== "increment") {
    return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
  }
  if (field !== "stock" && field !== "waitlist") {
    return NextResponse.json({ error: "Campo inválido" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (direction === "decrement") {
    const { data } = await supabase.from("articles").select(field).eq("id", articleId).single();
    const available = (data as Record<string, number> | null)?.[field] ?? 0;
    if (available < amount) {
      const error = field === "waitlist" ? "Lista de espera llena" : "Sin stock suficiente";
      return NextResponse.json({ error, available }, { status: 409 });
    }
    if (field === "waitlist") {
      await supabase.rpc("decrement_waitlist", { article_id: articleId, amount });
    } else {
      await supabase.rpc("decrement_stock", { article_id: articleId, amount });
    }
  } else {
    if (field === "waitlist") {
      await supabase.rpc("increment_waitlist", { article_id: articleId, amount });
    } else {
      await supabase.rpc("increment_stock", { article_id: articleId, amount });
    }
  }

  return NextResponse.json({ ok: true });
}
