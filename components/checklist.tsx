// components/checklist.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/apiFetch";

/* ---------- 型と定数 ---------- */
export type PhaseKey = "phase1" | "phase2" | "phase3" | "phase4" | "phase5";

export const PHASE_LABELS: Record<PhaseKey, string> = {
  phase1: "離乳初期",
  phase2: "離乳中期",
  phase3: "離乳後期",
  phase4: "完了期",
  phase5: "幼児期",
};

const PHASE_ITEMS: { key: PhaseKey; label: string; sub?: string }[] = [
  { key: "phase1", label: "離乳初期", sub: "5〜6か月目安" },
  { key: "phase2", label: "離乳中期", sub: "7〜8か月目安" },
  { key: "phase3", label: "離乳後期", sub: "9〜11か月目安" },
  { key: "phase4", label: "完了期", sub: "12〜18か月目安" },
  { key: "phase5", label: "幼児期", sub: "18か月以降目安" },
];

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
  const [phase, setPhaseState] = useState<PhaseKey>("phase1"); // SSR初期値
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

/* ---------- 右上固定ボタン（濃い茶＋ハンバーガー） ---------- */
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

/* ---------- 右スライドドロワー（選択しても閉じない） ---------- */
export function ChecklistPanel() {
  const { phase, setPhase, open, setOpen, childMode, setChildMode, children, memberId, childrenLoading } =
    useChecklist();
  const heading = "時期を選択"; // ← 現在の選択表示をなくす

  const onBackdropClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if ((e.target as HTMLElement).dataset?.backdrop === "true") {
      setOpen(false);
    }
  };

  const onSelect = (key: PhaseKey) => {
    setPhase(key);
    // ← 自動で閉じない：setOpen(false) は削除
  };

  // カラーパレット（薄い順）
  const BG_PANEL = "bg-[#FAF8F6]";     // パネル背景：さらに薄い茶色
  const BG_ITEM  = "bg-[#F0E4D8]";     // 選択肢：薄い茶色
  const BG_ACTIVE= "bg-[#E6D6C9]";     // 選択中：少し濃い茶色
  const TXT_HEAD = "text-[#4D3F36]";   // 見出し＆本文の濃い茶
  const headerDescription =
    memberId && childMode ? "表示モードを選択してください。" : "乳幼児の段階を選択してください。";
  const isMember = Boolean(memberId);
  const handleSelectChildMode = () => {
    if (!isMember) {
      alert("この機能は会員限定です");
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
            <h4 className={`text-base font-semibold ${TXT_HEAD}`}>表示モード</h4>
            <p className="text-xs text-[#6B5A4E] mt-1">
              園児モードでは登録済みの食べられない食品のみ緑で表示します。
            </p>

            {childrenLoading && isMember && (
              <p className="text-xs text-[#6B5A4E] mt-3">読み込み中...</p>
            )}

            {!childrenLoading && isMember && children.length === 0 && (
              <p className="text-xs text-[#6B5A4E] mt-3">園児の登録がありません。</p>
            )}

            {!isMember && (
              <p className="text-xs text-[#6B5A4E] mt-3">園児モードは会員限定です。</p>
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
                <span className={`font-medium ${TXT_HEAD}`}>乳児期別表示</span>
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
                <span className={`font-medium ${TXT_HEAD}`}>園児モード</span>
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


