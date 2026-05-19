"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const schema = z.object({ email: z.string().email() });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
    const [sent, setSent] = useState(false);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    async function onSubmit(data: FormData) {
        const supabase = createClient();
        await supabase.auth.resetPasswordForEmail(data.email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
        });
        setSent(true);
    }

    if (sent) {
        return (
            <div className="text-center space-y-4">
                <div className="text-4xl">📬</div>
                <h2 className="text-2xl font-bold">Check your email</h2>
                <p className="text-muted-foreground">We sent a password reset link to your inbox.</p>
                <Link href="/login" className="text-primary text-sm hover:underline">Back to sign in</Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold">Forgot password?</h1>
                <p className="text-muted-foreground text-sm">Enter your email and we'll send a reset link.</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register("email")} placeholder="you@example.com" />
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Sending…" : "Send Reset Link"}
                </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
            </p>
        </div>
    );
}
