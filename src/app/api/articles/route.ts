import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, price, stock, status, thumbnail_url, extra_image_urls = [] } = body;

  const supabase = createServiceClient();
  const slug = slugify(title);

  const { data: article, error } = await supabase
    .from("articles")
    .insert({ title, slug, description, price, stock, status, thumbnail_url })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (extra_image_urls.length > 0) {
    await supabase.from("article_images").insert(
      extra_image_urls.map((url: string, i: number) => ({ article_id: article.id, url, sort_order: i }))
    );
  }

  return NextResponse.json(article, { status: 201 });
}
