"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type Theme = "indigo" | "orange" | "green";

export interface CardImage {
  id: string;
  title: string;
  thumbnail_url: string | null;
}

export interface SlideData {
  badge: string;
  titleTop: string;
  titleHighlight: string;
  titleBottom: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  theme: Theme;
  images: CardImage[];
}

// ── Theme config ──────────────────────────────────────────────────────────────

const THEMES: Record<
  Theme,
  {
    background: string;
    glow1: string;
    glow2: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    highlightGradient: string;
    ctaBg: string;
    ctaBgHover: string;
    ctaShadow: string;
    dotActive: string;
  }
> = {
  indigo: {
    background: "linear-gradient(135deg, #020617 0%, #1e1b4b 55%, #0f172a 100%)",
    glow1: "rgba(67,56,202,0.25)",
    glow2: "rgba(109,40,217,0.2)",
    badgeBg: "rgba(99,102,241,0.12)",
    badgeBorder: "rgba(99,102,241,0.28)",
    badgeText: "#a5b4fc",
    highlightGradient: "linear-gradient(90deg,#818cf8,#a78bfa,#818cf8)",
    ctaBg: "#4f46e5",
    ctaBgHover: "#4338ca",
    ctaShadow: "0 10px 30px rgba(79,70,229,0.4)",
    dotActive: "#818cf8",
  },
  orange: {
    background: "linear-gradient(135deg, #1c0800 0%, #7c2d12 55%, #431407 100%)",
    glow1: "rgba(234,88,12,0.25)",
    glow2: "rgba(217,119,6,0.2)",
    badgeBg: "rgba(234,88,12,0.12)",
    badgeBorder: "rgba(234,88,12,0.3)",
    badgeText: "#fdba74",
    highlightGradient: "linear-gradient(90deg,#fb923c,#fbbf24,#fb923c)",
    ctaBg: "#ea580c",
    ctaBgHover: "#c2410c",
    ctaShadow: "0 10px 30px rgba(234,88,12,0.4)",
    dotActive: "#fb923c",
  },
  green: {
    background: "linear-gradient(135deg, #022c22 0%, #065f46 55%, #064e3b 100%)",
    glow1: "rgba(5,150,105,0.25)",
    glow2: "rgba(13,148,136,0.2)",
    badgeBg: "rgba(5,150,105,0.12)",
    badgeBorder: "rgba(5,150,105,0.3)",
    badgeText: "#6ee7b7",
    highlightGradient: "linear-gradient(90deg,#34d399,#2dd4bf,#34d399)",
    ctaBg: "#059669",
    ctaBgHover: "#047857",
    ctaShadow: "0 10px 30px rgba(5,150,105,0.4)",
    dotActive: "#34d399",
  },
};

// ── Card fan ──────────────────────────────────────────────────────────────────

const ROTATIONS = [-12, -4, 5, 14];
const OFFSETS = [
  { x: -20, y: 10 },
  { x: -8, y: -5 },
  { x: 8, y: 5 },
  { x: 22, y: 12 },
];

function CardFan({ images }: { images: CardImage[] }) {
  if (images.length < 2) return null;
  return (
    <div className="relative flex-shrink-0 w-72 h-72 md:w-80 md:h-80 select-none">
      {images.slice(0, 4).map((card, i) => (
        <div
          key={card.id}
          className="absolute w-36 h-52 md:w-44 md:h-60 rounded-2xl overflow-hidden border border-white/10"
          style={{
            top: "50%",
            left: "50%",
            zIndex: i,
            transform: `translate(calc(-50% + ${OFFSETS[i].x}px), calc(-50% + ${OFFSETS[i].y}px)) rotate(${ROTATIONS[i]}deg)`,
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
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
        </div>
      ))}
    </div>
  );
}

// ── Slider ────────────────────────────────────────────────────────────────────

const INTERVAL_MS = 5500;

export default function HeroSlider({ slides }: { slides: SlideData[] }) {
  const [current, setCurrent] = useState(0);
  const isHoveredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!isHoveredRef.current) {
        setCurrent((prev) => (prev + 1) % slides.length);
      }
    }, INTERVAL_MS);
  }, [slides.length]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  const goTo = (index: number) => {
    setCurrent(((index % slides.length) + slides.length) % slides.length);
    resetTimer();
  };

  const currentTheme = THEMES[slides[current].theme];

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => { isHoveredRef.current = true; }}
      onMouseLeave={() => { isHoveredRef.current = false; }}
    >
      {/* Sliding rail */}
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, i) => {
          const t = THEMES[slide.theme];
          return (
            <div
              key={i}
              className="relative w-full flex-shrink-0 overflow-hidden"
              style={{ background: t.background }}
              aria-hidden={i !== current}
            >
              {/* Grid texture */}
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
                  backgroundSize: "60px 60px",
                }}
              />

              {/* Glow blobs */}
              <div
                className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
                style={{ background: t.glow1 }}
              />
              <div
                className="absolute -bottom-40 -right-20 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none"
                style={{ background: t.glow2 }}
              />

              {/* Content */}
              <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28 flex flex-col md:flex-row items-center gap-12 md:gap-8">

                {/* Left copy */}
                <div className="flex-1 text-center md:text-left">
                  <span
                    className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
                    style={{
                      background: t.badgeBg,
                      border: `1px solid ${t.badgeBorder}`,
                      color: t.badgeText,
                    }}
                  >
                    {slide.badge}
                  </span>

                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-5">
                    {slide.titleTop}
                    <br />
                    <span
                      style={{
                        backgroundImage: t.highlightGradient,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {slide.titleHighlight}
                    </span>
                    {slide.titleBottom && (
                      <>
                        <br />
                        {slide.titleBottom}
                      </>
                    )}
                  </h1>

                  <p className="text-slate-400 text-base sm:text-lg leading-relaxed mb-8 max-w-md mx-auto md:mx-0">
                    {slide.description}
                  </p>

                  <Link
                    href={slide.ctaHref}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 font-bold rounded-2xl text-sm text-white transition-colors"
                    style={{ background: t.ctaBg, boxShadow: t.ctaShadow }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = t.ctaBgHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = t.ctaBg)}
                  >
                    {slide.ctaLabel}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </Link>
                </div>

                {/* Right card fan */}
                <CardFan images={slide.images} />
              </div>

              {/* Bottom fade to page background */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* ── Dot indicators ── */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Ir al slide ${i + 1}`}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? "24px" : "8px",
              height: "8px",
              background: i === current ? currentTheme.dotActive : "rgba(255,255,255,0.25)",
            }}
          />
        ))}
      </div>

      {/* ── Prev arrow ── */}
      <button
        onClick={() => goTo(current - 1)}
        aria-label="Slide anterior"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* ── Next arrow ── */}
      <button
        onClick={() => goTo(current + 1)}
        aria-label="Slide siguiente"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
