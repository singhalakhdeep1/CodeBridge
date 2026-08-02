import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { WebVitalsReporter } from "@/components/providers/web-vitals-reporter";
import { ApolloProvider } from "@/lib/graphql/ApolloProvider";
import "./globals.css";

export const metadata: Metadata = {
    title: { default: "CodeSync", template: "%s | CodeSync" },
    description: "Real-time collaborative code editor with AI-powered completions. Edit together, build faster.",
    keywords: ["collaborative editor", "code editor", "real-time", "monaco", "AI completions"],
    authors: [{ name: "CodeSync" }],
    openGraph: {
        type: "website",
        title: "CodeSync",
        description: "Real-time collaborative code editor with AI-powered completions.",
        siteName: "CodeSync",
    },
    twitter: { card: "summary_large_image", title: "CodeSync" },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: [
        { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
            <body className="font-sans antialiased">
                <ApolloProvider>
                    <WebVitalsReporter />
                    {children}
                </ApolloProvider>
            </body>
        </html>
    );
}
