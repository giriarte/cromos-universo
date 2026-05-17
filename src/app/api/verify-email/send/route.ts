import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { sendVerificationEmail } from "@/lib/ses";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Rate-limit: one code per minute per email
  const { count } = await supabase
    .from("email_verifications")
    .select("*", { count: "exact", head: true })
    .eq("email", email)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .gt("created_at", new Date(Date.now() - 60_000).toISOString());

  if (count && count > 0) {
    return NextResponse.json(
      { error: "Ya enviamos un código. Esperá 1 minuto antes de solicitar otro." },
      { status: 429 }
    );
  }

  const code = Math.floor(100_000 + Math.random() * 900_000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

  await supabase.from("email_verifications").insert({ email, code, expires_at: expiresAt });

  try {
    await sendVerificationEmail(email, code);
  } catch (err) {
    console.error("[verify-email/send]", err);
    return NextResponse.json({ error: "No se pudo enviar el email. Intentá de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
