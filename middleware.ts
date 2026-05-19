import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis/client";

export async function middleware(req: NextRequest) {
    // Rate limit API routes
    if (req.nextUrl.pathname.startsWith("/api/")) {
        try {
            const redis = getRedis();
            const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, "1m") });
            const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
            const { success } = await ratelimit.limit(ip);
            if (!success) {
                return NextResponse.json({ error: "Too many requests" }, { status: 429 });
            }
        } catch (error) {
            // Redis not configured, skip rate limiting
            console.warn("Redis not configured, skipping rate limiting");
        }
    }

    return await updateSession(req);
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
