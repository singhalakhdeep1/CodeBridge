export const APP_NAME = "CodeSync";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:1234";

// Editor
export const DEFAULT_LANGUAGE = "typescript";
export const AUTOSAVE_DEBOUNCE_MS = 1500;
export const SNAPSHOT_INTERVAL_MS = 30_000; // save version every 30s of editing

// Execution
export const EXECUTION_TIMEOUT_MS = 10_000;
export const MAX_OUTPUT_BYTES = 65_536; // 64KB

// Collaboration
export const MAX_COLLABORATORS = 50;
export const PRESENCE_UPDATE_INTERVAL_MS = 500;

// Plan limits
export const PLAN_LIMITS = {
    free: { documents: 5, members: 3, history_days: 7 },
    pro: { documents: 100, members: 10, history_days: 30 },
    team: { documents: Infinity, members: Infinity, history_days: 90 },
} as const;

// Language → Monaco language ID mapping
export const LANGUAGE_MONACO_MAP: Record<string, string> = {
    typescript: "typescript",
    javascript: "javascript",
    python: "python",
    rust: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    ruby: "ruby",
    php: "php",
    swift: "swift",
    kotlin: "kotlin",
    sql: "sql",
    html: "html",
    css: "css",
    json: "json",
    yaml: "yaml",
    markdown: "markdown",
    bash: "shell",
};

// Language → file extension
export const LANGUAGE_EXTENSION_MAP: Record<string, string> = {
    typescript: "ts",
    javascript: "js",
    python: "py",
    rust: "rs",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    ruby: "rb",
    php: "php",
    swift: "swift",
    kotlin: "kt",
    sql: "sql",
    html: "html",
    css: "css",
    json: "json",
    yaml: "yml",
    markdown: "md",
    bash: "sh",
};

// Collaborator cursor colors (cycling)
export const CURSOR_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
    "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
    "#BB8FCE", "#82E0AA",
];
