import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUploadPresignedUrl, getPublicUrl } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key, contentType } = await req.json();
  if (!key || !contentType) return NextResponse.json({ error: "Missing key or contentType" }, { status: 400 });

  const url = await getUploadPresignedUrl(key, contentType);
  const publicUrl = getPublicUrl(key);

  return NextResponse.json({ url, publicUrl });
}
