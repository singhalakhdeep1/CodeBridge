"use client";

/**
 * CodeSync — Error boundaries for crash-prone sub-trees.
 *
 * The Monaco editor and xterm terminal are the two most likely crash points
 * (large WASM/Worker bundles, browser API mismatches).
 *
 * Skill coverage: react-error-boundary v5, production resilience patterns
 */

import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { AlertTriangle, RefreshCw, Terminal, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Shared fallback UI component ──────────────────────────────────────────────

function ErrorFallback({ error, resetErrorBoundary, icon: Icon, label }: FallbackProps & {
    icon: React.ElementType;
    label: string;
}) {
    return (
        <div
            role="alert"
            className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 p-6 text-center bg-destructive/5 border border-destructive/20 rounded-lg"
        >
            <Icon className="h-8 w-8 text-destructive/60" />
            <div>
                <p className="font-medium text-sm text-destructive">{label} failed to load</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    {error?.message ?? "An unexpected error occurred."}
                </p>
            </div>
            <Button size="sm" variant="outline" onClick={resetErrorBoundary} className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
            </Button>
        </div>
    );
}

// ── Editor error boundary ─────────────────────────────────────────────────────

export function EditorErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundary
            fallbackRender={(props) => (
                <ErrorFallback {...props} icon={Code2} label="Monaco Editor" />
            )}
            onError={(error) => {
                // Report to Sentry in production
                console.error("[EditorErrorBoundary]", error);
            }}
        >
            {children}
        </ErrorBoundary>
    );
}

// ── Terminal error boundary ───────────────────────────────────────────────────

export function TerminalErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundary
            fallbackRender={(props) => (
                <ErrorFallback {...props} icon={Terminal} label="Terminal" />
            )}
            onError={(error) => {
                console.error("[TerminalErrorBoundary]", error);
            }}
        >
            {children}
        </ErrorBoundary>
    );
}

// ── Generic panel error boundary ─────────────────────────────────────────────

export function PanelErrorBoundary({ children, label = "Panel" }: { children: React.ReactNode; label?: string }) {
    return (
        <ErrorBoundary
            fallbackRender={(props) => (
                <ErrorFallback {...props} icon={AlertTriangle} label={label} />
            )}
            onError={(error) => {
                console.error(`[PanelErrorBoundary:${label}]`, error);
            }}
        >
            {children}
        </ErrorBoundary>
    );
}
