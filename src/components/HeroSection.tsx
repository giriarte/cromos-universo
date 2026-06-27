import Image from "next/image";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import type { Article } from "@/types/database";

export default async function HeroSection() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("articles")
    .select("id, title, thumbnail_url, slug")
    .eq("status", "active")
    .not("thumbnail_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(4);

  const cards = (data ?? []) as Pick<Article, "id" | "title" | "thumbnail_url" | "slug">[];

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Ambient glow blobs */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-700 blur-[140px] opacity-20 pointer-events-none" />
      <div className="absolute -bottom-40 -right-20 w-[400px] h-[400px] rounded-full bg-violet-700 blur-[120px] opacity-20 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28 flex flex-col md:flex-row items-center gap-12 md:gap-8">

        {/* ── Left: copy ── */}
        <div className="flex-1 text-center md:text-left">
          <span className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-xs font-semibold tracking-widest uppercase">
            <span className="text-amber-400">★</span> Colección Mundial 2026 GOLD
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-5">
            El universo de<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300">
              los cromos
            </span>
            <br />está acá.
          </h1>

          <p className="text-slate-400 text-base sm:text-lg leading-relaxed mb-8 max-w-md mx-auto md:mx-0">
            Cromos oficiales, colecciones exclusivas y más. Encontrá los que te faltan y completá tu álbum.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <Link
              href="#catalogo"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-950/60 text-sm"
            >
              Ver colección
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ── Right: card fan ── */}
        {cards.length >= 2 && (
          <div className="relative flex-shrink-0 w-72 h-72 md:w-80 md:h-80 select-none">
            {cards.slice(0, 4).map((card, i) => {
              const rotations = [-12, -4, 5, 14];
              const offsets = [
                { x: -20, y: 10 },
                { x: -8, y: -5 },
                { x: 8, y: 5 },
                { x: 22, y: 12 },
              ];
              return (
                <div
                  key={card.id}
                  className="absolute w-36 h-52 md:w-44 md:h-60 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                  style={{
                    top: "50%",
                    left: "50%",
                    zIndex: i,
                    transform: `translate(calc(-50% + ${offsets[i].x}px), calc(-50% + ${offsets[i].y}px)) rotate(${rotations[i]}deg)`,
                    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
                  }}
                >
                  {card.thumbnail_url && (
                    <Image
                      src={card.thumbnail_url}
                      alt={card.title}
                      fill
                      sizes="176px"
                      className="object-cover"
                    />
                  )}
                  {/* Foil shimmer overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fade to page background */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}
