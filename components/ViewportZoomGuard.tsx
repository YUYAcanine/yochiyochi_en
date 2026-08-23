// components/ViewportZoomGuard.tsx
"use client";

import { useEffect } from "react";

const isFormField = (target: EventTarget | null): target is HTMLElement =>
  target instanceof HTMLElement &&
  (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");

/**
 * Some mobile browsers ignore the viewport's user-scalable=no
 * and auto-zoom when an input field is focused.
 * Once input ends (on blur), reset the viewport to restore the original scale.
 */
export default function ViewportZoomGuard() {
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return;

    const originalContent = viewport.getAttribute("content") ?? "width=device-width, initial-scale=1";

    const resetZoom = () => {
      viewport.setAttribute("content", `${originalContent}, maximum-scale=1`);
      requestAnimationFrame(() => {
        viewport.setAttribute("content", originalContent);
      });
    };

    const handleFocusOut = (e: FocusEvent) => {
      if (!isFormField(e.target)) return;
      resetZoom();
    };

    document.addEventListener("focusout", handleFocusOut);
    return () => document.removeEventListener("focusout", handleFocusOut);
  }, []);

  return null;
}
