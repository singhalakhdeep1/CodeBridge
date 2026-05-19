import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Redis } from "@upstash/redis";

/**
 * CodeSync — Health check endpoint
 *
 * Checks: Supabase PostgreSQL + Upstash Redis
 * Cloudflare Workers (Durable Objects) have their own health surface
 * via the Cloudflare dashboard — not checked here.
 */

const redis = Redis.fromEnv();

export async function GET() {
    const checks: Record<string, { status: "ok" | "error"; latencyMs: number; error?: string }> = {};

    const dbStart = Date.now();
    try {
        const supabase = await createClient();
        const { error } = await supabase.from("documents").select("id").limit(1);
        if (error) throw error;
        checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
    } catch (err) {
        checks.database = {
            status: "error",
            latencyMs: Date.now() - dbStart,
            error: err instanceof Error ? err.message : "DB error",
        };
    }

    const redisStart = Date.now();
    try {
        await redis.ping();
        checks.redis = { status: "ok", latencyMs: Date.now() - redisStart };
    } catch (err) {
        checks.redis = {
            status: "error",
            latencyMs: Date.now() - redisStart,
            error: err instanceof Error ? err.message : "Redis error",
        };
    }

    const allOk = Object.values(checks).every((c) => c.status === "ok");

    return NextResponse.json(
        {
            status: allOk ? "healthy" : "degraded",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            checks,
        },
        {
            status: allOk ? 200 : 503,
            headers: { "Cache-Control": "no-store" },
        }
    );
}

export async function HEAD() {
    return new Response(null, { status: 200 });
}
