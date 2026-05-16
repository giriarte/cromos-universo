import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, email, password, role } = await req.json();
  if (!name || !email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const supabase = createServiceClient();
  const password_hash = await bcrypt.hash(password, 12);

  const { error } = await supabase.from("admin_users").insert({ name, email, password_hash, role: role ?? "editor" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
