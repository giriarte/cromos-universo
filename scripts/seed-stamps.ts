/**
 * Run: npm run seed-stamps
 *
 * Reads tmp/stamps/seed.json, fetches each stamp's main image from the
 * Wikipedia summary API, downloads it, uploads to S3, and inserts into DB.
 *
 * Safe to re-run: skips slugs already present in the "estampillas" category.
 */

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

// ── Load .env.local before any client init ────────────────────────────────────

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

// ── Validate env ──────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const BUCKET = process.env.APP_S3_BUCKET;
const REGION = process.env.APP_AWS_REGION;
if (!BUCKET || !REGION) {
  console.error("❌ Missing APP_S3_BUCKET or APP_AWS_REGION in .env.local");
  process.exit(1);
}

// ── Clients ───────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY!,
  },
});

const IMAGES_DIR = path.join(process.cwd(), "tmp", "stamp-images");
const SEED_FILE = path.join(process.cwd(), "tmp", "stamps", "seed.json");

// ── Types ─────────────────────────────────────────────────────────────────────

interface SeedEntry {
  nombre: string;
  enlace_wikipedia: string;
  descripcion: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith("https") ? https : http;
    const req = (protocol as typeof https).get(
      url,
      { headers: { "User-Agent": "CromosUniverso/1.0 (seed-stamps; a.g.iriarte@gmail.com)" } },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          try { fs.unlinkSync(dest); } catch {}
          downloadFile(res.headers.location!, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          try { fs.unlinkSync(dest); } catch {}
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
      }
    );
    req.on("error", (e) => { try { fs.unlinkSync(dest); } catch {} reject(e); });
  });
}

async function uploadToS3(localPath: string, key: string, contentType: string): Promise<string> {
  const body = fs.readFileSync(localPath);
  await s3.send(new PutObjectCommand({ Bucket: BUCKET!, Key: key, Body: body, ContentType: contentType }));
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

/**
 * Calls the Wikipedia summary REST API for the given article URL and returns
 * the main thumbnail image URL (typically 320px wide from Wikimedia Commons).
 */
async function getWikipediaThumbnail(wikiUrl: string): Promise<string | null> {
  // Extract article title from URL, e.g.:
  //   https://es.wikipedia.org/wiki/Penny_Black  →  Penny_Black
  const match = wikiUrl.match(/wikipedia\.org\/wiki\/(.+)$/);
  if (!match) return null;

  const title = match[1]; // already URL-encoded
  const lang = wikiUrl.includes("es.wikipedia") ? "es" : "en";
  const apiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`;

  try {
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "CromosUniverso/1.0 (seed-stamps; a.g.iriarte@gmail.com)" },
    });
    if (!res.ok) {
      // Try English Wikipedia as fallback
      if (lang === "es") {
        const enRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
          { headers: { "User-Agent": "CromosUniverso/1.0 (seed-stamps; a.g.iriarte@gmail.com)" } }
        );
        if (!enRes.ok) return null;
        const enData = (await enRes.json()) as { thumbnail?: { source?: string } };
        return enData.thumbnail?.source ?? null;
      }
      return null;
    }
    const data = (await res.json()) as { thumbnail?: { source?: string } };
    return data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(SEED_FILE)) {
    console.error(`❌ Seed file not found: ${SEED_FILE}`);
    process.exit(1);
  }
  const seeds: SeedEntry[] = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
  console.log(`📋 Loaded ${seeds.length} stamps from seed.json`);

  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  // Connectivity check
  console.log(`🔗 Checking Supabase connection...`);
  try {
    const probe = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!probe.ok && probe.status !== 401 && probe.status !== 404) {
      console.error(`❌ Supabase returned HTTP ${probe.status} — project may be paused at supabase.com`);
      process.exit(1);
    }
    console.log(`✓ Supabase reachable (HTTP ${probe.status})`);
  } catch (e) {
    console.error("❌ Cannot reach Supabase:", (e as Error).message);
    console.error("   → Check if project is paused at https://supabase.com/dashboard");
    process.exit(1);
  }

  // 1. Upsert category
  console.log("\n📁 Creating category 'Estampillas'...");
  const { data: catData, error: catError } = await supabase
    .from("categories")
    .upsert({ name: "Estampillas", slug: "estampillas" }, { onConflict: "slug" })
    .select("id")
    .single();

  if (catError) {
    console.error("❌ Error creating category:", catError.message);
    process.exit(1);
  }
  const categoryId = catData.id;
  console.log(`✓ Category ID: ${categoryId}`);

  // 2. Fetch existing slugs
  const { data: existingData } = await supabase
    .from("articles")
    .select("slug")
    .eq("category_id", categoryId);
  const existingSlugs = new Set((existingData ?? []).map((r: { slug: string }) => r.slug));
  console.log(`  ${existingSlugs.size} stamps already in DB — will skip these.\n`);

  // 3. Process each stamp
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of seeds) {
    const slug = slugify(entry.nombre);

    if (existingSlugs.has(slug)) {
      console.log(`  ⏭  Skipping: ${entry.nombre}`);
      skipped++;
      continue;
    }

    try {
      await new Promise((r) => setTimeout(r, 1200)); // respect Wikipedia rate limit

      process.stdout.write(`  ⬇  ${entry.nombre}...`);

      const thumbnailUrl = await getWikipediaThumbnail(entry.enlace_wikipedia);
      if (!thumbnailUrl) {
        console.log(` ⚠️  No thumbnail on Wikipedia — skipping`);
        failed++;
        continue;
      }

      // Derive extension from the Wikimedia thumbnail URL
      const urlPath = thumbnailUrl.split("?")[0];
      const rawExt = urlPath.split(".").pop()?.toLowerCase() ?? "jpg";
      const ext =
        rawExt === "jpeg" ? "jpg"
        : ["jpg", "png", "gif"].includes(rawExt) ? rawExt
        : "jpg";
      const contentType =
        ext === "png" ? "image/png"
        : ext === "gif" ? "image/gif"
        : "image/jpeg";

      const localFile = path.join(IMAGES_DIR, `${slug}.${ext}`);
      const s3Key = `stamps/${slug}.${ext}`;

      // Skip re-download if already on disk
      if (!fs.existsSync(localFile)) {
        await downloadFile(thumbnailUrl, localFile);
      }

      const publicUrl = await uploadToS3(localFile, s3Key, contentType);

      const { error: insertError } = await supabase.from("articles").insert({
        title: entry.nombre,
        slug,
        description: entry.descripcion,
        price: 12000,
        stock: 1,
        waitlist: 3,
        status: "active",
        category_id: categoryId,
        thumbnail_url: publicUrl,
      });

      if (insertError) {
        console.log(` ❌ DB: ${insertError.message}`);
        failed++;
      } else {
        console.log(" ✓");
        inserted++;
      }
    } catch (err) {
      console.log(`\n  ❌ Failed: ${entry.nombre} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n✅ Done: ${inserted} inserted, ${skipped} skipped, ${failed} failed.`);
  console.log(`   Local images: ${IMAGES_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
