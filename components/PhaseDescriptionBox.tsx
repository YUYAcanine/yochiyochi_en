// components/PhaseDescriptionBox.tsx
import React from "react";
import type { PhaseKey } from "@/types/food";

type Variant = "forbidden" | "ok" | "none" | "child" | "forbidden_child" | "ok_child";

type Props = {
  description?: string;
  phase?: PhaseKey;
  variant?: Variant;
  title?: string;
  showPhase?: boolean;
};

const classesByVariant: Record<Variant, string> = {
  forbidden: "bg-red-100 border-red-400 text-red-800",
  ok: "bg-yellow-100 border-yellow-400 text-zinc-800",
  none: "bg-gray-100 border-gray-400 text-zinc-800",
  child: "bg-red-100 border-red-400 text-zinc-800",
  forbidden_child: "bg-red-100 border-red-400 text-red-800",
  ok_child: "bg-yellow-100 border-yellow-400 text-zinc-800",
};

export default function PhaseDescriptionBox({
  description,
  phase,
  variant = "ok",
  title,
  showPhase = true,
}: Props) {
  if (!description) return null;
  const colorClass = classesByVariant[variant] ?? classesByVariant.ok;
  const label = title ?? (showPhase && phase ? `時期: ${phase}` : "");

  return (
    <div className={`w-full p-2 border rounded mt-2 ${colorClass}`}>
      {label && <div className="text-xs text-zinc-500 mb-1">{label}</div>}
      <div className="max-h-[40svh] overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">
        {description}
      </div>
    </div>
  );
}
