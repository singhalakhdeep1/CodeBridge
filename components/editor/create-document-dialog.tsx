"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LANGUAGES = [
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "rust", label: "Rust" },
    { value: "go", label: "Go" },
    { value: "cpp", label: "C++" },
    { value: "java", label: "Java" },
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "json", label: "JSON" },
    { value: "markdown", label: "Markdown" },
    { value: "sql", label: "SQL" },
];

const EXTENSION_MAP: Record<string, string> = {
    javascript: "js", typescript: "ts", python: "py", rust: "rs", go: "go",
    cpp: "cpp", java: "java", html: "html", css: "css", json: "json", markdown: "md", sql: "sql",
};

const schema = z.object({
    title: z.string().min(1, "Required").max(100),
    language: z.string().min(1, "Required"),
    path: z.string().min(1, "Required").max(255),
});
type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onCreateDocument: (title: string, language: string, path: string) => Promise<void>;
}

export function CreateDocumentDialog({ open, onOpenChange, onCreateDocument }: Props) {
    const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { language: "typescript" },
    });

    const title = watch("title");
    const language = watch("language");

    // Auto-fill path from title + extension
    function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value;
        register("title").onChange(e);
        if (val) {
            const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            const ext = EXTENSION_MAP[language] ?? "txt";
            setValue("path", `${slug}.${ext}`);
        }
    }

    function handleLanguageChange(val: string) {
        setValue("language", val);
        if (title) {
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            const ext = EXTENSION_MAP[val] ?? "txt";
            setValue("path", `${slug}.${ext}`);
        }
    }

    async function onSubmit(data: FormData) {
        await onCreateDocument(data.title, data.language, data.path);
        reset();
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>New File</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1">
                        <Label>File Name</Label>
                        <Input
                            placeholder="e.g. my-component"
                            {...register("title")}
                            onChange={handleTitleChange}
                        />
                        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                    </div>

                    <div className="space-y-1">
                        <Label>Language</Label>
                        <Select value={language} onValueChange={handleLanguageChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                                {LANGUAGES.map((l) => (
                                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.language && <p className="text-xs text-destructive">{errors.language.message}</p>}
                    </div>

                    <div className="space-y-1">
                        <Label>Path</Label>
                        <Input placeholder="e.g. src/components/button.ts" {...register("path")} />
                        {errors.path && <p className="text-xs text-destructive">{errors.path.message}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating…" : "Create File"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
