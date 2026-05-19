"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
    const router = useRouter();
    const supabase = createClient();

    const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
    });

    async function onSubmit(data: RegisterInput) {
        const { error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: { username: data.username, full_name: data.full_name },
            },
        });
        if (error) {
            setError("root", { message: error.message });
            return;
        }
        router.push("/login?msg=check-email");
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Create account</h2>
                <p className="text-muted-foreground mt-1">Start coding together in minutes</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input id="full_name" placeholder="Jane Smith" {...register("full_name")} />
                    {errors.full_name && <p className="text-destructive text-sm">{errors.full_name.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" placeholder="janesmith" {...register("username")} />
                    {errors.username && <p className="text-destructive text-sm">{errors.username.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="jane@example.com" {...register("email")} />
                    {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" {...register("password")} />
                    {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
                </div>

                {errors.root && (
                    <p className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">{errors.root.message}</p>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Creating account…" : "Create Account"}
                </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
        </div>
    );
}
