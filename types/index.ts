// CodeSync Types

export type Language =
    | "typescript"
    | "javascript"
    | "python"
    | "rust"
    | "go"
    | "java"
    | "cpp"
    | "c"
    | "ruby"
    | "php"
    | "swift"
    | "kotlin"
    | "sql"
    | "html"
    | "css"
    | "json"
    | "yaml"
    | "markdown"
    | "bash";

export type WorkspacePlan = "free" | "pro" | "team";
export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";
export type ExecutionStatus = "pending" | "running" | "success" | "error" | "timeout";

export interface Profile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    website: string | null;
    created_at: string;
    updated_at: string;
}

export interface Workspace {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    plan: WorkspacePlan;
    description?: string | null;
    max_members?: number;
    max_documents?: number;
    created_at: string;
    updated_at: string | null;
}

export interface WorkspaceMember {
    workspace_id: string;
    user_id: string;
    role: WorkspaceRole;
    joined_at: string;
    profile?: Profile;
}

export interface Document {
    id: string;
    workspace_id: string;
    title: string;
    language: Language;
    content: string;
    path: string;
    is_public: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
    created_by_profile?: Profile;
}

export interface DocumentVersion {
    id: string;
    document_id: string;
    content: string;
    snapshot: Uint8Array | null;
    created_by: string;
    created_at: string;
    label: string | null;
    created_by_profile?: Profile;
}

export interface Comment {
    id: string;
    document_id: string;
    author_id: string;
    line_start: number;
    line_end: number;
    content: string;
    resolved: boolean;
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string;
    updated_at: string;
    author?: Profile;
}

export interface ExecutionRun {
    id: string;
    document_id: string;
    user_id: string;
    language: Language;
    code: string;
    stdin: string | null;
    stdout: string | null;
    stderr: string | null;
    exit_code: number | null;
    duration_ms: number | null;
    status: ExecutionStatus;
    created_at: string;
}

// Presence / awareness (via Supabase Realtime Presence, not DB)
export interface UserPresence {
    userId: string;
    username: string;
    avatarUrl: string | null;
    color: string;  // unique color per collaborator cursor
    cursor: {
        lineNumber: number;
        column: number;
    } | null;
    selection: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
    } | null;
    lastSeen: string;
}

// File tree node (virtual, not persisted separately)
export interface FileTreeNode {
    name: string;
    path: string;
    type: "file" | "folder";
    language?: Language;
    documentId?: string;
    children?: FileTreeNode[];
}

// AI completion types
export interface AICompletion {
    text: string;
    isStreaming: boolean;
}

export interface AIMessage {
    role: "system" | "user" | "assistant";
    content: string;
}
