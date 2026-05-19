"use client";

/**
 * CodeSync — Core Web Vitals reporter
 *
 * Reports LCP, INP, CLS, FCP, TTFB to PostHog for real-user monitoring.
 * Mount once inside the root layout. Captures all vitals on page load.
 *
 * Skill coverage: web-vitals v4, Core Web Vitals (LCP, INP, CLS), PostHog RUM
 */

import { useEffect } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";
import posthog from "posthog-js";

function sendToPostHog(metric: Metric) {
    posthog.capture("web_vital", {
        metric_name: metric.name,           // LCP | INP | CLS | FCP | TTFB
        metric_value: Math.round(metric.value),
        metric_rating: metric.rating,       // "good" | "needs-improvement" | "poor"
        metric_delta: Math.round(metric.delta),
        metric_id: metric.id,
        navigation_type: metric.navigationType,
        $current_url: window.location.href,
    });
}

export function WebVitalsReporter() {
    useEffect(() => {
        // Register all Core Web Vitals + supplemental metrics
        onCLS(sendToPostHog);   // Cumulative Layout Shift
        onFCP(sendToPostHog);   // First Contentful Paint
        onINP(sendToPostHog);   // Interaction to Next Paint (replaced FID in 2024)
        onLCP(sendToPostHog);   // Largest Contentful Paint
        onTTFB(sendToPostHog);  // Time to First Byte
    }, []);

    return null; // purely side-effectful
}
