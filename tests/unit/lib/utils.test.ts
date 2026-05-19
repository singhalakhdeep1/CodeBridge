import { describe, it, expect } from "vitest";
import { cn, formatRelativeTime, getInitials, truncate, getCursorColor, getLanguageFromPath, formatBytes, buildFileTree } from "@/lib/utils";

describe("cn", () => {
    it("merges class names", () => {
        expect(cn("a", "b")).toBe("a b");
    });
    it("handles conditional classes", () => {
        expect(cn("a", false && "b", "c")).toBe("a c");
    });
});

describe("getInitials", () => {
    it("returns initials from full name", () => {
        expect(getInitials("Alice Bob")).toBe("AB");
    });
    it("handles single name", () => {
        expect(getInitials("Alice")).toBe("A");
    });
    it("returns ? for empty", () => {
        expect(getInitials("")).toBe("?");
    });
});

describe("truncate", () => {
    it("truncates long text", () => {
        expect(truncate("hello world", 5)).toBe("hello…");
    });
    it("does not truncate short text", () => {
        expect(truncate("hi", 10)).toBe("hi");
    });
});

describe("getCursorColor", () => {
    it("returns a color string", () => {
        const color = getCursorColor(0);
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
    it("wraps around for large indices", () => {
        const c1 = getCursorColor(0);
        const c2 = getCursorColor(10); // 10 % 10 = 0
        expect(c1).toBe(c2);
    });
});

describe("getLanguageFromPath", () => {
    it("detects ts from .tsx", () => {
        expect(getLanguageFromPath("components/button.tsx")).toBe("typescript");
    });
    it("detects python", () => {
        expect(getLanguageFromPath("script.py")).toBe("python");
    });
    it("returns plaintext for unknown", () => {
        expect(getLanguageFromPath("README.xyz")).toBe("plaintext");
    });
});

describe("formatBytes", () => {
    it("formats 0", () => expect(formatBytes(0)).toBe("0 Bytes"));
    it("formats kilobytes", () => expect(formatBytes(1024)).toBe("1 KB"));
    it("formats megabytes", () => expect(formatBytes(1024 * 1024)).toBe("1 MB"));
});

describe("buildFileTree", () => {
    it("builds tree from flat list", () => {
        const docs = [
            { id: "1", title: "index.ts", path: "/src/index.ts", language: "typescript" },
            { id: "2", title: "utils.ts", path: "/src/utils.ts", language: "typescript" },
        ];
        const tree = buildFileTree(docs);
        expect(tree.length).toBeGreaterThan(0);
    });
});
