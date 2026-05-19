import { Providers } from "@/components/providers/providers";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <Providers>
            <div className="min-h-screen flex">
                {/* Left branding */}
                <div className="hidden lg:flex lg:flex-1 bg-[hsl(var(--sidebar-bg))] border-r border-border items-center justify-center p-12">
                    <div className="max-w-md space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                                <span className="text-primary-foreground font-bold text-lg font-mono">{"<>"}</span>
                            </div>
                            <span className="text-2xl font-bold tracking-tight">CodeSync</span>
                        </div>
                        <h1 className="text-3xl font-bold text-foreground leading-tight">
                            Code together,<br />ship faster.
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Real-time collaborative editing powered by CRDT — no merge conflicts, ever.
                            AI completions built in.
                        </p>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            {[
                                "Monaco Editor — the VS Code editing experience",
                                "Yjs CRDT — conflict-free collaborative editing",
                                "OpenAI streaming completions",
                                "Secure code execution sandbox",
                                "Inline code review comments",
                            ].map((feature) => (
                                <li key={feature} className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                {/* Right form */}
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="w-full max-w-md">{children}</div>
                </div>
            </div>
        </Providers>
    );
}
