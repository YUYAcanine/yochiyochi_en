// components/checklist.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/apiFetch";

/* ---------- Types and constants ---------- */
export type PhaseKey = "phase1" | "phase2" | "phase3" | "phase4" | "phase5";

export const PHASE_LABELS: Record<PhaseKey, string> = {
  phase1: "Early Weaning",
  phase2: "Mid Weaning",
  phase3: "Late Weaning",
  phase4: "Completion Stage",
  phase5: "Toddler Stage",
};

export const PHASE_AGE_LABELS: Record<PhaseKey, string> = {
  phase1: "approx. 5-6 months",
  phase2: "approx. 7-8 months",
  phase3: "approx. 9-11 months",
  phase4: "approx. 12-18 months",
  phase5: "approx. 18+ months",
};

const PHASE_ITEMS: { key: PhaseKey; label: string; sub?: string }[] = (
  Object.keys(PHASE_LABELS) as PhaseKey[]
).map((key) => ({ key, label: PHASE_LABELS[key], sub: PHASE_AGE_LABELS[key] }));

/* ---------- Storage helper ---------- */
const STORAGE_KEY = "checklistPhase";
const STORAGE_CHILD_MODE_KEY = "checklistChildMode";

function safeGetPhase(): PhaseKey {
  if (typeof window === "undefined") return "phase1";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "phase2" || raw === "phase3" || raw === "phase4" || raw === "phase5") return raw;
  return "phase1";
}
function safeSetPhase(p: PhaseKey) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, p);
}
function safeGetChildMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_CHILD_MODE_KEY) === "true";
}
function safeSetChildMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_CHILD_MODE_KEY, enabled ? "true" : "false");
}

/* ---------- Context ---------- */
type ChildItem = {
  id: string;
  child_name: string;
  age_month: number;
  no_eat: string;
  can_eat: boolean | null;
  note: string | null;
};

type ChecklistContextType = {
  phase: PhaseKey;
  setPhase: (p: PhaseKey) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  childMode: boolean;
  setChildMode: (enabled: boolean) => void;
  children: ChildItem[];
  memberId: string | null;
  loggedIn: boolean;
  childrenLoading: boolean;
};

const ChecklistContext = createContext<ChecklistContextType | undefined>(undefined);

/* ---------- Provider ---------- */
export function ChecklistProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhaseState] = useState<PhaseKey>("phase1"); // SSR initial value
  const [open, setOpen] = useState<boolean>(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [childrenItems, setChildrenItems] = useState<ChildItem[]>([]);
  const [childMode, setChildModeState] = useState<boolean>(false);
  const [childrenLoading, setChildrenLoading] = useState(false);

  const syncAuthState = () => {
    if (typeof window === "undefined") return;
    const nextLoggedIn = localStorage.getItem("yochiLoggedIn") === "true";
    const storedMemberId = localStorage.getItem("yochiMemberId");
    setLoggedIn(nextLoggedIn);
    setMemberId(nextLoggedIn ? storedMemberId : null);
    if (!nextLoggedIn) {
      setChildModeState(false);
      safeSetChildMode(false);
    }
  };

  const setPhase = (p: PhaseKey) => {
    setPhaseState(p);
    safeSetPhase(p);
  };

  const setChildMode = (enabled: boolean) => {
    setChildModeState(enabled);
    safeSetChildMode(enabled);
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPhaseState(safeGetPhase());
      if (e.key === STORAGE_CHILD_MODE_KEY) setChildModeState(safeGetChildMode());
      if (e.key === "yochiLoggedIn" || e.key === "yochiMemberId") {
        syncAuthState();
      }
    };
    const onAuthChanged = () => {
      syncAuthState();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("yochi-auth-changed", onAuthChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("yochi-auth-changed", onAuthChanged);
    };
  }, []);

  useEffect(() => {
    setPhaseState(safeGetPhase());
    setChildModeState(safeGetChildMode());
    syncAuthState();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadChildren() {
      if (!memberId) {
        setChildrenItems([]);
        setChildrenLoading(false);
        return;
      }
      setChildrenLoading(true);
      try {
        const res = await authedFetch(`/api/enji-info`, { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        const items: ChildItem[] = Array.isArray(json) ? json : json.items ?? [];
        if (cancelled) return;
        setChildrenItems(items);
      } catch (e) {
        if (!cancelled) {
          setChildrenItems([]);
        }
      } finally {
        if (!cancelled) setChildrenLoading(false);
      }
    }

    loadChildren();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const value = useMemo(
    () => ({
      phase,
      setPhase,
      open,
      setOpen,
      childMode,
      setChildMode,
      children: childrenItems,
      memberId,
      loggedIn,
      childrenLoading,
    }),
    [phase, open, childMode, childrenItems, memberId, loggedIn, childrenLoading]
  );
  return <ChecklistContext.Provider value={value}>{children}</ChecklistContext.Provider>;
}

/* ---------- Hook ---------- */
export function useChecklist() {
  const ctx = useContext(ChecklistContext);
  if (!ctx) throw new Error("useChecklist must be used inside ChecklistProvider");
  return ctx;
}

/* ---------- Fixed top-right button (dark brown + hamburger) ---------- */
export function ChecklistButton() {
  const { open, setOpen } = useChecklist();
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="fixed top-4 right-4 z-[60] flex flex-col justify-center items-center gap-1.5 px-5 py-3 rounded-lg 
                 bg-[#5C3A2E] text-white shadow hover:bg-[#6E4B3F] transition"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="checklist-drawer"
    >
      <span
        className={`block w-6 h-0.5 bg-white transition-transform ${
          open ? "rotate-45 translate-y-1.5" : ""
        }`}
      />
      <span
        className={`block w-6 h-0.5 bg-white transition-opacity ${
          open ? "opacity-0" : ""
        }`}
      />
      <span
        className={`block w-6 h-0.5 bg-white transition-transform ${
          open ? "-rotate-45 -translate-y-1.5" : ""
        }`}
      />
    </button>
  );
}

/* ---------- Right slide-in drawer (stays open on selection) ---------- */
export function ChecklistPanel() {
  const { phase, setPhase, open, setOpen, childMode, setChildMode, children, memberId, childrenLoading } =
    useChecklist();
  const heading = "Select Stage"; // Intentionally not showing the current selection

  const onBackdropClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if ((e.target as HTMLElement).dataset?.backdrop === "true") {
      setOpen(false);
    }
  };

  const onSelect = (key: PhaseKey) => {
    setPhase(key);
    // Intentionally not calling setOpen(false) so the drawer stays open
  };

  // Color palette (lightest first)
  const BG_PANEL = "bg-[#FAF8F6]";     // panel background: lightest brown
  const BG_ITEM  = "bg-[#F0E4D8]";     // option: light brown
  const BG_ACTIVE= "bg-[#E6D6C9]";     // selected: slightly darker brown
  const TXT_HEAD = "text-[#4D3F36]";   // heading & body: dark brown
  const headerDescription =
    memberId && childMode ? "Select a display mode." : "Select the infant's weaning stage.";
  const isMember = Boolean(memberId);
  const handleSelectChildMode = () => {
    if (!isMember) {
      alert("This feature is for members only");
      return;
    }
    setChildMode(true);
  };

  return (
    <>
      <div
        data-backdrop="true"
        onClick={onBackdropClick}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!open}
      />
      <aside
        id="checklist-drawer"
        role="dialog"
        aria-label={heading}
        className={`fixed top-0 right-0 h-full w-80 ${BG_PANEL} shadow-xl z-50 transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-4 border-b border-[#E5D9CE]">
          <h3 className={`text-lg font-semibold ${TXT_HEAD}`}>{heading}</h3>
          <p className="text-xs text-[#6B5A4E] mt-1">{headerDescription}</p>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100%-3.5rem)]">
          <div>
            <h4 className={`text-base font-semibold ${TXT_HEAD}`}>Display Mode</h4>
            <p className="text-xs text-[#6B5A4E] mt-1">
              Child mode highlights only each registered child&apos;s restricted foods in green.
            </p>

            {childrenLoading && isMember && (
              <p className="text-xs text-[#6B5A4E] mt-3">Loading...</p>
            )}

            {!childrenLoading && isMember && children.length === 0 && (
              <p className="text-xs text-[#6B5A4E] mt-3">No children registered.</p>
            )}

            {!isMember && (
              <p className="text-xs text-[#6B5A4E] mt-3">Child mode is for members only.</p>
            )}

            <div className="mt-3 space-y-2">
              <label
                className="flex items-center gap-3 rounded-xl p-3 cursor-pointer border bg-[#F0E4D8] border-[#E5D9CE] hover:brightness-95"
                onClick={() => setChildMode(false)}
              >
                <input
                  type="radio"
                  name="display-mode"
                  checked={!childMode}
                  onChange={() => setChildMode(false)}
                  className="accent-[#5C3A2E]"
                />
                <span className={`font-medium ${TXT_HEAD}`}>By Weaning Stage</span>
              </label>
              <label
                className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer border bg-[#E6F4EA] border-[#9FD3AE] hover:brightness-95 ${
                  isMember ? "" : "opacity-60"
                }`}
                onClick={handleSelectChildMode}
              >
                <input
                  type="radio"
                  name="display-mode"
                  checked={isMember && childMode}
                  onChange={handleSelectChildMode}
                  disabled={!isMember}
                  className="accent-[#2F7D4C]"
                />
                <span className={`font-medium ${TXT_HEAD}`}>Child Mode</span>
              </label>
            </div>
          </div>

          {!childMode && (
            <div className="mt-6 pt-4 border-t border-[#E5D9CE]">
              {PHASE_ITEMS.map((item) => {
                const active = phase === item.key;
                return (
                  <label
                    key={item.key}
                    className={`flex items-start gap-3 rounded-xl p-3 mb-2 cursor-pointer border
                                ${active ? `${BG_ACTIVE} border-[#D4C3B6]` : `${BG_ITEM} border-[#E5D9CE]`}
                                hover:brightness-95`}
                    onClick={() => onSelect(item.key)}
                  >
                    <input
                      type="radio"
                      name="weaning-phase"
                      value={item.key}
                      checked={active}
                      onChange={() => onSelect(item.key)}
                      className="mt-1 accent-[#5C3A2E]"
                    />
                    <div>
                      <div className={`font-medium ${TXT_HEAD}`}>
                        {item.label}
                        <span className="ml-2 text-xs text-[#6B5A4E]">{item.sub}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}


