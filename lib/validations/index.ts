import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
    username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username must be at most 30 characters")
        .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
    full_name: z.string().min(2, "Full name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export const createWorkspaceSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50),
    slug: z.string()
        .min(2)
        .max(30)
        .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

export const createDocumentSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    language: z.string().min(1),
    path: z.string().min(1).default("/"),
    workspace_id: z.string().uuid(),
});

export const updateDocumentSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    language: z.string().optional(),
    content: z.string().optional(),
    path: z.string().optional(),
});

export const createCommentSchema = z.object({
    document_id: z.string().uuid(),
    line_start: z.number().int().min(1),
    line_end: z.number().int().min(1),
    content: z.string().min(1, "Comment cannot be empty").max(4000),
});

export const executeCodeSchema = z.object({
    document_id: z.string().uuid(),
    language: z.string().min(1),
    code: z.string().min(1),
    stdin: z.string().optional(),
});

export const aiCompletionSchema = z.object({
    document_id: z.string().uuid(),
    language: z.string().min(1),
    prefix: z.string(), // code before cursor
    suffix: z.string(), // code after cursor
    max_tokens: z.number().int().min(1).max(500).default(150),
});

export const aiChatSchema = z.object({
    document_id: z.string().uuid().optional(),
    language: z.string().optional(),
    code: z.string().optional(),
    messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
    })).min(1).max(20),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type ExecuteCodeInput = z.infer<typeof executeCodeSchema>;
export type AICompletionInput = z.infer<typeof aiCompletionSchema>;
export type AIChatInput = z.infer<typeof aiChatSchema>;
