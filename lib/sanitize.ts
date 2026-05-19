/**
 * Sanitize untrusted HTML — OWASP A03:2021 XSS prevention.
 * Used for AI-generated markdown/HTML responses in the chat panel.
 */

import DOMPurify from "dompurify";

/** Config for AI assistant responses — allows code blocks and formatted text. */
const AI_RESPONSE_CONFIG: DOMPurify.Config = {
    ALLOWED_TAGS: [
        "p", "br", "b", "i", "em", "strong", "code", "pre",
        "ul", "ol", "li", "h1", "h2", "h3", "h4", "span", "a",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "data-language"],
    FORCE_BODY: true,
};

/** Strip all HTML — safe plain text (for tooltips, tab titles, etc.). */
const PLAIN_CONFIG: DOMPurify.Config = {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
};

/**
 * Sanitize AI-generated HTML before rendering with dangerouslySetInnerHTML.
 * Ensures all external links have rel="noopener noreferrer".
 */
export function sanitizeHtml(dirty: string): string {
    if (typeof window === "undefined") return stripHtml(dirty);
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
        if (node.tagName === "A") {
            node.setAttribute("target", "_blank");
            node.setAttribute("rel", "noopener noreferrer");
        }
    });
    const clean = DOMPurify.sanitize(dirty, AI_RESPONSE_CONFIG) as string;
    DOMPurify.removeHook("afterSanitizeAttributes");
    return clean;
}

/**
 * Strip all HTML — returns safe plain text.
 * Works in both browser and SSR/Node contexts.
 */
export function stripHtml(dirty: string): string {
    if (typeof window === "undefined") {
        return dirty.replace(/<[^>]*>/g, "");
    }
    return DOMPurify.sanitize(dirty, PLAIN_CONFIG) as string;
}
