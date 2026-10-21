import DOMPurify from "dompurify";

type DOMPurifyConfig = Parameters<typeof DOMPurify.sanitize>[1];

const AI_RESPONSE_CONFIG: DOMPurifyConfig = {
    ALLOWED_TAGS: [
        "p", "br", "b", "i", "em", "strong", "code", "pre",
        "ul", "ol", "li", "h1", "h2", "h3", "h4", "span", "a",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "data-language"],
    FORCE_BODY: true,
};

const PLAIN_CONFIG: DOMPurifyConfig = {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
};

export function sanitizeHtml(dirty: string): string {
    if (typeof window === "undefined") return stripHtml(dirty);
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
        if (node.tagName === "A") {
            node.setAttribute("target", "_blank");
            node.setAttribute("rel", "noopener noreferrer");
        }
    });
    const clean = DOMPurify.sanitize(dirty, AI_RESPONSE_CONFIG) as unknown as string;
    DOMPurify.removeHook("afterSanitizeAttributes");
    return clean;
}

export function stripHtml(dirty: string): string {
    if (typeof window === "undefined") {
        return dirty.replace(/<[^>]*>/g, "");
    }
    return DOMPurify.sanitize(dirty, PLAIN_CONFIG) as unknown as string;
}
