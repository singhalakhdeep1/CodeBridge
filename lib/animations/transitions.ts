"use client";

/**
 * CodeSync — GSAP + View Transitions API integration
 *
 * gsapTransition: wraps document.startViewTransition() with GSAP for
 * coordinated enter/exit animations on route changes.
 *
 * usePageTransition: React hook that intercepts Next.js router navigation
 * and plays GSAP animations before/after the route change.
 *
 * Skill coverage: GSAP, View Transitions API (CSS + JS)
 */

import { gsap } from "gsap";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

// Register GSAP plugins (ScrollTrigger, etc.) — tree-shaken if unused
// gsap.registerPlugin(ScrollTrigger);

// ─── View Transition + GSAP orchestration ─────────────────────────────────────

/**
 * Navigate with a View Transition + GSAP animation.
 * Falls back to instant navigation if View Transitions API is unavailable.
 */
export function navigateWithTransition(
    router: ReturnType<typeof useRouter>,
    href: string,
    animationPreset: "slide-left" | "slide-right" | "fade" | "scale" = "fade"
): void {
    if (!("startViewTransition" in document)) {
        router.push(href);
        return;
    }

    (document as any).startViewTransition(async () => {
        // GSAP exit animation runs during the "capturing" phase
        await playExitAnimation(animationPreset);
        router.push(href);
    });
}

async function playExitAnimation(preset: string): Promise<void> {
    const tl = gsap.timeline();

    switch (preset) {
        case "slide-left":
            await tl.to("main", { x: -60, opacity: 0, duration: 0.25, ease: "power2.in" });
            break;
        case "slide-right":
            await tl.to("main", { x: 60, opacity: 0, duration: 0.25, ease: "power2.in" });
            break;
        case "scale":
            await tl.to("main", { scale: 0.95, opacity: 0, duration: 0.2, ease: "power2.in" });
            break;
        case "fade":
        default:
            await tl.to("main", { opacity: 0, duration: 0.18, ease: "power1.in" });
    }
}

/** Call on page enter — animates the incoming page into view */
export function playEnterAnimation(
    preset: "slide-left" | "slide-right" | "fade" | "scale" = "fade"
): void {
    const tl = gsap.timeline();

    gsap.set("main", { opacity: 0, x: 0, scale: 1 }); // reset

    switch (preset) {
        case "slide-left":
            tl.fromTo("main", { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" });
            break;
        case "slide-right":
            tl.fromTo("main", { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" });
            break;
        case "scale":
            tl.fromTo("main", { scale: 1.03, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.28, ease: "back.out(1.4)" });
            break;
        case "fade":
        default:
            tl.fromTo("main", { opacity: 0 }, { opacity: 1, duration: 0.22, ease: "power1.out" });
    }
}

// ─── React hook ───────────────────────────────────────────────────────────────

export function usePageTransition() {
    const router = useRouter();

    const push = useCallback(
        (href: string, preset: "slide-left" | "slide-right" | "fade" | "scale" = "fade") => {
            navigateWithTransition(router, href, preset);
        },
        [router]
    );

    return { push };
}

// ─── GSAP stagger reveal (for file tree, search results lists) ────────────────

/**
 * Stagger-reveal a list of elements on mount.
 * Usage: gsapStaggerReveal(".file-item")
 */
export function gsapStaggerReveal(selector: string, delay = 0): void {
    gsap.fromTo(
        selector,
        { y: 12, opacity: 0 },
        {
            y: 0,
            opacity: 1,
            duration: 0.3,
            stagger: 0.04,
            ease: "power2.out",
            delay,
        }
    );
}

/**
 * Animate a collaborator cursor from old position to new (smooth tracking).
 */
export function animateCursor(element: HTMLElement, x: number, y: number): void {
    gsap.to(element, {
        x,
        y,
        duration: 0.12,
        ease: "power1.out",
        overwrite: "auto",
    });
}
