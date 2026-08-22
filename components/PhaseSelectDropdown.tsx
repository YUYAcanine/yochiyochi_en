"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { PHASE_AGE_LABELS } from "@/components/checklist";
import type { PhaseKey } from "@/types/food";

type Props = {
  phase: PhaseKey;
  onChangePhase: (phase: PhaseKey) => void;
  labels: Record<PhaseKey, string>;
  className?: string;
};

export default function PhaseSelectDropdown({
  phase,
  onChangePhase,
  labels,
  className = "",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const keys = React.useMemo(() => Object.keys(labels) as PhaseKey[], [labels]);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const handleSelect = (key: PhaseKey) => {
    onChangePhase(key);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={className}>
      <div className="relative rounded-xl bg-brand p-2 shadow-md">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="h-11 min-w-[190px] rounded-md bg-[#F2F0EE] px-4 pr-16 text-left text-lg font-bold text-[#2F2A27] outline-none sm:min-w-[210px] md:min-w-[240px]"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="時期を選択"
        >
          {labels[phase]}
        </button>
        <div className="pointer-events-none absolute right-2 top-2 h-11 w-12 rounded-r-md bg-brand" />
        <ChevronDown
          strokeWidth={3.5}
          className={`pointer-events-none absolute right-5 top-1/2 h-6 w-6 -translate-y-1/2 text-white transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />

        {open && (
          <ul
            role="listbox"
            aria-label="時期の選択肢"
            className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-lg border border-[#D8C6B8] bg-[#F2F0EE] shadow-lg"
          >
            {keys.map((key) => {
              const selected = key === phase;
              return (
                <li key={key} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => handleSelect(key)}
                    className={`flex w-full items-baseline gap-2 px-4 py-2 text-left text-base font-semibold ${
                      selected
                        ? "bg-[#E2D2C4] text-[#2F2A27]"
                        : "bg-[#F2F0EE] text-[#2F2A27] hover:bg-[#EDE2D8]"
                    }`}
                  >
                    {labels[key]}
                    <span className="text-xs font-medium text-[#6B5A4E]">{PHASE_AGE_LABELS[key]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
