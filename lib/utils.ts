import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";
import { CURSOR_COLORS } from "@/lib/constants";
import type { Language } from "@/types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
    if (!date) return "never";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "never";
    return formatDistanceToNow(d, { addSuffix: true });
}

export function getInitials(name: string): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function truncate(str: string, max: number): string {
    return str.length <= max ? str : str.slice(0, max) + "…";
}

export function getCursorColor(index: number): string {
    return CURSOR_COLORS[index % CURSOR_COLORS.length];
}

export function getLanguageFromPath(path: string): Language {
    const ext = path.split(".").pop()?.toLowerCase();
    const map: Record<string, Language> = {
        ts: "typescript", tsx: "typescript",
        js: "javascript", jsx: "javascript",
        py: "python",
        rs: "rust",
        go: "go",
        java: "java",
        cpp: "cpp", cc: "cpp",
        c: "c", h: "c",
        rb: "ruby",
        php: "php",
        swift: "swift",
        kt: "kotlin",
        sql: "sql",
        html: "html", htm: "html",
        css: "css",
        json: "json",
        yaml: "yaml", yml: "yaml",
        md: "markdown",
        sh: "bash", bash: "bash",
    };
    return (ext ? map[ext] : undefined) ?? "typescript";
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function buildFileTree(documents: Array<{ id: string; title: string; path: string; language: Language }>) {
    const root: Record<string, unknown> = {};
    for (const doc of documents) {
        const parts = doc.path.replace(/^\//, "").split("/");
        let node = root;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!node[part]) node[part] = {};
            node = node[part] as Record<string, unknown>;
        }
        const filename = parts[parts.length - 1];
        node[filename] = { _doc: doc };
    }
    return root;
}
