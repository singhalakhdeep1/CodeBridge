"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateWorkspace } from "@/lib/hooks/use-workspace";
import { useToast } from "@/lib/hooks/use-toast";
import type { Workspace } from "@/types";

const schema = z.object({
    name: z.string().min(2, "At least 2 characters").max(50),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
    description: z.string().max(200).optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onCreated: (workspace: Workspace) => void;
}

export function CreateWorkspaceDialog({ open, onOpenChange, onCreated }: Props) {
    const { toast } = useToast();
    const createWorkspace = useCreateWorkspace();

    const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const name = watch("name", "");

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        const v = e.target.value;
        setValue("name", v);
        setValue("slug", v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }

    async function onSubmit(data: FormData) {
        try {
            const workspace = await createWorkspace.mutateAsync(data);
            onCreated(workspace);
            onOpenChange(false);
            reset();
        } catch {
            toast({ title: "Failed to create workspace", variant: "destructive" });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Workspace</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    <div className="space-y-1">
                        <Label htmlFor="name">Workspace Name</Label>
                        <Input id="name" {...register("name")} onChange={handleNameChange} placeholder="My Team" />
                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="slug">Slug</Label>
                        <Input id="slug" {...register("slug")} placeholder="my-team" />
                        {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea id="description" {...register("description")} placeholder="What will you build?" rows={2} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={createWorkspace.isPending}>
                            {createWorkspace.isPending ? "Creating…" : "Create Workspace"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
