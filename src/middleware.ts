import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const { auth } = NextAuth(authConfig);

// General API routes: 60 requests per 10 seconds per IP
const apiLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "10 s"),
  prefix: "rl:api",
  analytics: false,
});

// Sensitive endpoints: 15 requests per 60 seconds per IP
const sensitiveLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(15, "60 s"),
  prefix: "rl:sensitive",
  analytics: false,
});

const SENSITIVE_ROUTES = [
  "/api/stock",
  "/api/orders",
  "/api/verify-email",
  "/api/cart/clear",
];

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Rate limit all API routes
  if (pathname.startsWith("/api/")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "anonymous";

    const isSensitive = SENSITIVE_ROUTES.some((r) => pathname.startsWith(r));
    const { success } = await (isSensitive ? sensitiveLimiter : apiLimiter).limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Esperá unos segundos e intentá de nuevo." },
        { status: 429 }
      );
    }
  }

  // Admin auth
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginPage = pathname === "/admin/login";

  // Stamp the pathname so the layout can read it without restructuring routes
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  if (isAdminRoute && !isLoginPage && !req.auth) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (isLoginPage && req.auth) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/:path*"],
};
