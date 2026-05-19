"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
    });

    async function onSubmit(data: LoginInput) {
        const { error } = await supabase.auth.signInWithPassword(data);
        if (error) {
            setError("root", { message: error.message });
            return;
        }
        router.push("/workspaces");
        router.refresh();
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Welcome back</h2>
                <p className="text-muted-foreground mt-1">Sign in to your CodeSync account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
                    {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                            Forgot password?
                        </Link>
                    </div>
                    <Input id="password" type="password" {...register("password")} />
                    {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
                </div>

                {errors.root && (
                    <p className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">{errors.root.message}</p>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Signing in…" : "Sign In"}
                </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary hover:underline font-medium">
                    Sign up
                </Link>
            </p>
        </div>
    );
}
