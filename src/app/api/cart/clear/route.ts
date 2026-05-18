import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Called via navigator.sendBeacon when the last browser tab is closed.
// Restores stock / waitlist slots so items don't stay reserved forever.
export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const supabase = createServiceClient();

    await Promise.all(
      items.map(async (item: { articleId: string; quantity: number; isWaitlist: boolean }) => {
        if (!item.articleId || typeof item.quantity !== "number" || item.quantity < 1) return;
        if (item.isWaitlist) {
          await supabase.rpc("increment_waitlist", { article_id: item.articleId, amount: item.quantity });
        } else {
          await supabase.rpc("increment_stock", { article_id: item.articleId, amount: item.quantity });
        }
      })
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
