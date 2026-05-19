import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Providers } from "@/components/providers/providers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    return (
        <Providers>
            <div className="h-screen flex flex-col overflow-hidden">
                {children}
            </div>
        </Providers>
    );
}
