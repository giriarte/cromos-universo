import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUploadPresignedUrl, getPublicUrl } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { key, contentType } = await req.json();
    if (!key || !contentType) return NextResponse.json({ error: "Missing key or contentType" }, { status: 400 });

    const url = await getUploadPresignedUrl(key, contentType);
    const publicUrl = getPublicUrl(key);

    return NextResponse.json({ url, publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[upload-url]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
