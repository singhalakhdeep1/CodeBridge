import { Redis } from "@upstash/redis";

let _redisInstance: Redis | null = null;

export function getRedis(): Redis {
    if (!_redisInstance) {
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
            throw new Error("Redis environment variables not configured");
        }
        _redisInstance = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
    return _redisInstance;
}

// Convenience proxy — routes can import { redis } directly
export const redis = new Proxy({} as Redis, {
    get(_t, prop) {
        return (getRedis() as unknown as Record<string | symbol, unknown>)[prop];
    },
});

export const CACHE_KEYS = {
    workspace: (id: string) => `workspace:${id}`,
    workspaceMembers: (id: string) => `workspace:${id}:members`,
    document: (id: string) => `document:${id}`,
    documentList: (workspaceId: string) => `workspace:${workspaceId}:documents`,
    profile: (username: string) => `profile:${username}`,
} as const;

export const CACHE_TTL = {
    workspace: 300,   // 5 min
    document: 60,     // 1 min (content changes frequently)
    documentList: 120,
    profile: 600,     // 10 min
} as const;
