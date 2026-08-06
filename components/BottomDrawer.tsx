// components/BottomDrawer.tsx
"use client";
import * as React from "react";
import PhaseDescriptionBox from "@/components/PhaseDescriptionBox";
import { PHASE_LABELS } from "@/components/checklist";
import type { PhaseKey } from "@/types/food";

type Variant = "forbidden" | "ok" | "none" | "child" | "forbidden_child" | "ok_child";

type Props = {
  openText: string;
  description?: string;

  cookDescription?: string;
  childDescription?: string;

  phase: PhaseKey;
  variant: Variant;
  cookVariant?: Variant;

  onClose: () => void;
  onShowAccidentInfo?: () => void;
  onHideAccidentInfo?: () => void;
  accidentInfo?: string;
  showAccidentInfo?: boolean;
  cookEditor?: {
    canEdit: boolean;
    isEditing: boolean;
    drafts: Partial<Record<PhaseKey, string>>;
    onChangePhase: (phase: PhaseKey, value: string) => void;
    onStart: () => void;
    onCancel: () => void;
    onSave: () => void;
    saving: boolean;
    message?: string | null;
  };
};


export default function BottomDrawer({
  openText,
  cookDescription,
  childDescription,
  phase,
  variant,
  cookVariant,
  onClose,
  onShowAccidentInfo,
  onHideAccidentInfo,
  accidentInfo,
  showAccidentInfo,
  cookEditor,
}: Props) {
  const open = !!openText && (!!cookDescription || !!childDescription) && variant !== "none";

  return (
    <>
      <aside
        className={`fixed left-0 right-0 bottom-0 z-40 transform transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        role="dialog"
        aria-label="説明"
      >
        <div className="mx-auto max-w-3xl rounded-t-2xl border border-[#E3D4C7] bg-[#F5EDE6] shadow-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-zinc-700">
            食材名：<span className="font-medium text-zinc-900">{openText}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#D8C7B8]
                       bg-[#EFE4DA] text-2xl font-semibold leading-none text-[#5B4A3F] transition hover:bg-[#E6D8CC]"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {cookDescription && (
          <PhaseDescriptionBox
            description={cookDescription}
            phase={phase}
            variant={cookVariant === "none" ? "ok" : cookVariant}
            title="調理情報"
          />
        )}

          {cookEditor?.canEdit && (
            <div className="mt-2 pt-2 border-t border-[#E8DCD0]">
              {!cookEditor.isEditing && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={cookEditor.onStart}
                    className="text-[#6b5a4e] underline underline-offset-4 font-semibold transition-opacity duration-200 hover:opacity-70 py-1"
                  >
                    調理情報を編集
                  </button>
                </div>
              )}
            </div>
          )}

        {childDescription && (
          <PhaseDescriptionBox
            description={childDescription}
            phase={phase}
            variant="child"
            title="園児情報"
            showPhase={false}
          />
        )}

        {onShowAccidentInfo && !showAccidentInfo && (
          <div className="mt-2 pt-2 border-t border-[#E8DCD0] flex justify-end">
            <button
              type="button"
              onClick={onShowAccidentInfo}
              className="text-[#6b5a4e] underline underline-offset-4 
                         font-semibold transition-opacity duration-200 hover:opacity-70 py-1"
            >
              事故情報を見る
            </button>
          </div>
        )}

        {showAccidentInfo && accidentInfo && (
          <div className="mt-4 pt-4 border-t border-[#E8DCD0]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[#5C3A2E]">事故情報</h3>
              <button
                type="button"
                onClick={() => onHideAccidentInfo && onHideAccidentInfo()}
                className="text-[#6b5a4e] text-decoration-underline text-underline-offset-4 
                           font-semibold transition-opacity duration-200 hover:opacity-70"
              >
                閉じる
              </button>
            </div>
            <div className="bg-[#F5EDE6] rounded-lg p-4 border border-[#E3D4C7]">
              <div className="text-[#4D3F36] leading-relaxed whitespace-pre-wrap">
                {accidentInfo}
              </div>
            </div>
          </div>
        )}
        </div>
      </aside>

      {cookEditor?.canEdit && cookEditor.isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="dialog"
          aria-label="調理情報を編集"
        >
          <div className="w-full max-w-3xl rounded-2xl border border-[#E8DCD0] bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#5C3A2E]">
                食材名：{openText}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-[#6B5A4E]">
                    <th className="pb-2 pr-3 font-semibold whitespace-nowrap">乳児期</th>
                    <th className="pb-2 font-semibold">調理方法</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {(Object.keys(PHASE_LABELS) as PhaseKey[]).map((phaseKey) => (
                    <tr key={phaseKey} className="border-t border-[#E8DCD0]">
                      <td className="py-2 pr-3 text-[#5C3A2E] font-medium whitespace-nowrap">
                        {PHASE_LABELS[phaseKey]}
                      </td>
                      <td className="py-2">
                        <textarea
                          className="w-full rounded-lg border border-[#D3C5B9] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C7A690]"
                          rows={2}
                          value={cookEditor.drafts?.[phaseKey] ?? ""}
                          onChange={(e) => cookEditor.onChangePhase(phaseKey, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={cookEditor.onCancel}
                className="rounded-lg border border-[#D6C2B4] bg-[#F5EDE6] px-4 py-2 text-sm font-semibold text-[#6B5A4E] hover:bg-[#E7DBCF]"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={cookEditor.onSave}
                disabled={cookEditor.saving}
                className="rounded-lg bg-[#9C7B6C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A88877] disabled:opacity-60"
              >
                {cookEditor.saving ? "保存中..." : "保存する"}
              </button>
            </div>
            {cookEditor.message && (
              <p className="mt-3 text-sm text-[#6B5A4E]">{cookEditor.message}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
