import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

export async function GET() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: name.trim(), slug: slugify(name) })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
