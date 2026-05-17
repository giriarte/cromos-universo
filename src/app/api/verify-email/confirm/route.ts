import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();
  if (!email || !code) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data } = await supabase
    .from("email_verifications")
    .select("id")
    .eq("email", email)
    .eq("code", code)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return NextResponse.json({ error: "Código incorrecto o expirado." }, { status: 400 });
  }

  await supabase.from("email_verifications").update({ used: true }).eq("id", data.id);

  return NextResponse.json({ ok: true });
}
