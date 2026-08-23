// components/ViewportZoomGuard.tsx
"use client";

import { useEffect } from "react";

const isFormField = (target: EventTarget | null): target is HTMLElement =>
  target instanceof HTMLElement &&
  (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");

/**
 * 一部のモバイルブラウザはviewportのuser-scalable=noを無視し、
 * 入力欄フォーカス時に自動でズームすることがある。
 * 入力が終わった（blurした）タイミングでviewportを再設定し、元の倍率に戻す。
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
