import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, description, price, stock, waitlist, status, category_id, thumbnail_url, extra_image_urls = [], removed_image_ids = [] } = body;

  if ((stock !== undefined && stock > 3) || (waitlist !== undefined && waitlist > 3)) {
    return NextResponse.json({ error: "El stock y la lista de espera no pueden superar 3" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const update: Record<string, unknown> = { description, price, stock, status, category_id: category_id || null, thumbnail_url };
  if (waitlist !== undefined) update.waitlist = waitlist;
  if (title) {
    update.title = title;
    update.slug = slugify(title);
  }

  const { error } = await supabase.from("articles").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (removed_image_ids.length > 0) {
    await supabase.from("article_images").delete().in("id", removed_image_ids);
  }

  if (extra_image_urls.length > 0) {
    const { data: existing } = await supabase
      .from("article_images")
      .select("sort_order")
      .eq("article_id", id)
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextOrder = ((existing as { sort_order: number }[] | null)?.[0]?.sort_order ?? -1) + 1;

    await supabase.from("article_images").insert(
      extra_image_urls.map((url: string, i: number) => ({
        article_id: id,
        url,
        sort_order: nextOrder + i,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceClient();

  const { count } = await supabase
    .from("order_items")
    .select("*", { count: "exact", head: true })
    .eq("article_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: "Este artículo tiene pedidos asociados y no puede eliminarse. Desactivalo en su lugar." },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
