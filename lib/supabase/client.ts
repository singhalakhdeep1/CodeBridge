"use client";

import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

export function createClient() {
    return createSSRBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}
