"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/hooks/use-toast";

const profileSchema = z.object({
    full_name: z.string().min(1).max(100),
    username: z.string().min(3).max(30).regex(/^[a-z0-9_-]+$/),
    bio: z.string().max(200).optional(),
});

const passwordSchema = z.object({
    password: z.string().min(8),
    confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords must match", path: ["confirmPassword"] });

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
    const { toast } = useToast();
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState<"profile" | "password" | "danger">("profile");

    const profileForm = useForm<ProfileData>({ resolver: zodResolver(profileSchema) });
    const passwordForm = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) });

    async function onProfileSubmit(data: ProfileData) {
        const { error } = await supabase
            .from("profiles")
            .update(data)
            .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");

        if (error) toast({ title: "Failed to save", variant: "destructive" });
        else toast({ title: "Profile updated" });
    }

    async function onPasswordSubmit(data: PasswordData) {
        const { error } = await supabase.auth.updateUser({ password: data.password });
        if (error) toast({ title: error.message, variant: "destructive" });
        else { toast({ title: "Password changed" }); passwordForm.reset(); }
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-6">
            <h1 className="text-2xl font-bold mb-8">Settings</h1>

            {/* Tabs */}
            <div className="flex gap-1 mb-8 border-b border-border">
                {(["profile", "password", "danger"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm capitalize -mb-px border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    >
                        {tab === "danger" ? "Danger Zone" : tab}
                    </button>
                ))}
            </div>

            {activeTab === "profile" && (
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <div className="space-y-1">
                        <Label>Full Name</Label>
                        <Input {...profileForm.register("full_name")} />
                        {profileForm.formState.errors.full_name && (
                            <p className="text-xs text-destructive">{profileForm.formState.errors.full_name.message}</p>
                        )}
                    </div>
                    <div className="space-y-1">
                        <Label>Username</Label>
                        <Input {...profileForm.register("username")} />
                        {profileForm.formState.errors.username && (
                            <p className="text-xs text-destructive">{profileForm.formState.errors.username.message}</p>
                        )}
                    </div>
                    <div className="space-y-1">
                        <Label>Bio</Label>
                        <Input {...profileForm.register("bio")} placeholder="Tell your team about yourself..." />
                    </div>
                    <Button type="submit" disabled={profileForm.formState.isSubmitting}>Save Changes</Button>
                </form>
            )}

            {activeTab === "password" && (
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <div className="space-y-1">
                        <Label>New Password</Label>
                        <Input type="password" {...passwordForm.register("password")} />
                        {passwordForm.formState.errors.password && (
                            <p className="text-xs text-destructive">{passwordForm.formState.errors.password.message}</p>
                        )}
                    </div>
                    <div className="space-y-1">
                        <Label>Confirm Password</Label>
                        <Input type="password" {...passwordForm.register("confirmPassword")} />
                        {passwordForm.formState.errors.confirmPassword && (
                            <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                        )}
                    </div>
                    <Button type="submit" disabled={passwordForm.formState.isSubmitting}>Change Password</Button>
                </form>
            )}

            {activeTab === "danger" && (
                <div className="border border-destructive rounded-lg p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
                    <p className="text-sm text-muted-foreground">These actions are permanent and cannot be undone.</p>
                    <Button
                        variant="destructive"
                        onClick={async () => {
                            if (!confirm("Delete account? This is permanent.")) return;
                            await supabase.auth.signOut();
                        }}
                    >
                        Delete Account
                    </Button>
                </div>
            )}
        </div>
    );
}
