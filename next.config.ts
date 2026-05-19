import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withPWA from "next-pwa";

const withPWAConfig = withPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
    runtimeCaching: [
        {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "api", networkTimeoutSeconds: 10 },
        },
    ],
});

/**
 * Content Security Policy — OWASP A05:2021
 * Prevents XSS, clickjacking, and data injection attacks.
 */
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://*.posthog.com https://*.sentry.io;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.supabase.co https://ui-avatars.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  connect-src 'self' ws://localhost:1234 wss://localhost:1234 https://*.supabase.co wss://*.supabase.co https://api.openai.com https://*.posthog.com https://*.sentry.io https://*.upstash.io;
  worker-src 'self' blob:;
`.replace(/\n/g, " ").trim();

const securityHeaders = [
    { key: "Content-Security-Policy", value: ContentSecurityPolicy },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-XSS-Protection", value: "1; mode=block" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
    reactStrictMode: true,
    experimental: {
        optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
    },
    serverExternalPackages: ["import-in-the-middle", "require-in-the-middle"],
    // Turbopack alias — mirrors the webpack alias below (Turbopack ignores webpack config)
    turbopack: {
        resolveAlias: {
            "monaco-editor": "monaco-editor/esm/vs/editor/editor.api",
        },
    },
    async headers() {
        return [{ source: "/(.*)", headers: securityHeaders }];
    },
    // Webpack config needed for Monaco Editor (large bundle, avoid SSR)
    webpack: (config, { isServer }) => {
        if (isServer) return config;
        config.resolve.alias = {
            ...config.resolve.alias,
            // Worker imports from monaco-editor
            "monaco-editor": "monaco-editor/esm/vs/editor/editor.api",
        };
        return config;
    },
};

export default withSentryConfig(withPWAConfig(nextConfig), {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: true,
    widenClientFileUpload: true,
    disableLogger: true,
});
