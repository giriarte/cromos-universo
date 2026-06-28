import { createServiceClient } from "@/lib/supabase";
import HeroSlider, { type CardImage, type SlideData } from "./HeroSlider";

type CategoryRow = { id: string; slug: string; name: string };

async function getCategoryImages(
  supabase: ReturnType<typeof createServiceClient>,
  categoryId: string | null,
  limit = 4
): Promise<CardImage[]> {
  let q = supabase
    .from("articles")
    .select("id, title, thumbnail_url")
    .eq("status", "active")
    .not("thumbnail_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (categoryId) q = q.eq("category_id", categoryId);

  const { data } = await q;
  return (data ?? []) as CardImage[];
}

export default async function HeroSection() {
  const supabase = createServiceClient();

  const { data: catData } = await supabase.from("categories").select("id, slug, name");
  const categories = (catData ?? []) as CategoryRow[];

  // Resolve each category by slug keyword — robust to exact naming in admin
  const find = (keyword: string): CategoryRow | null =>
    categories.find(
      (c) => c.slug.includes(keyword) || c.name.toLowerCase().includes(keyword)
    ) ?? null;

  const mundialCat = find("mundial");
  const monedasCat = find("moneda");
  const estampillasCat = find("estampilla");

  const [mundialImages, monedasImages, estampillasImages] = await Promise.all([
    getCategoryImages(supabase, mundialCat?.id ?? null),
    getCategoryImages(supabase, monedasCat?.id ?? null),
    getCategoryImages(supabase, estampillasCat?.id ?? null),
  ]);

  const slides: SlideData[] = [
    {
      badge: "★ Colección Oficial FIFA",
      titleTop: "El universo de",
      titleHighlight: "los cromos",
      titleBottom: "está acá.",
      description:
        "Cromos oficiales, colecciones exclusivas y más. Encontrá los que te faltan y completá tu álbum.",
      ctaLabel: "Ver colección",
      ctaHref: mundialCat
        ? `/?cat=${mundialCat.slug}#catalogo`
        : "/#catalogo",
      theme: "indigo",
      images: mundialImages,
    },
    {
      badge: "★ Monedas del mundo",
      titleTop: "Viajá por el mundo",
      titleHighlight: "con cada moneda",
      titleBottom: "que coleccionás.",
      description:
        "Monedas históricas y coleccionables de más de 50 países. Piezas únicas para tu colección.",
      ctaLabel: "Ver monedas",
      ctaHref: monedasCat
        ? `/?cat=${monedasCat.slug}#catalogo`
        : "/?cat=monedas-del-mundo#catalogo",
      theme: "orange",
      images: monedasImages,
    },
    {
      badge: "★ Filatelia",
      titleTop: "La historia del mundo",
      titleHighlight: "en cada estampilla",
      titleBottom: "",
      description:
        "Sellos postales de los cinco continentes. Rarezas filatélicas y emisiones históricas de colección.",
      ctaLabel: "Ver estampillas",
      ctaHref: estampillasCat
        ? `/?cat=${estampillasCat.slug}#catalogo`
        : "/?cat=estampillas#catalogo",
      theme: "green",
      images: estampillasImages,
    },
  ];

  return <HeroSlider slides={slides} />;
}
