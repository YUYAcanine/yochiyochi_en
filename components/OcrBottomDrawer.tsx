/**
 * OcrBottomDrawer
 *
 * OCRで選択された文字に対する説明を表示する下部ドロワー。
 *
 * - フェーズ別の注意文言の表示
 * - 事故情報表示ボタンの提供
 *
 * このコンポーネント自身は状態を持たず、
 * 表示内容や開閉制御はすべて props 経由で受け取る。
 * 実体は既存の BottomDrawer コンポーネントをラップしている。
**/

"use client";

import React from "react";
import BottomDrawer from "@/components/BottomDrawer";
import type { PhaseKey } from "@/types/food";

type Variant = "forbidden" | "ok" | "none" | "child" | "forbidden_child" | "ok_child";

type Props = {
  selectedText: string;
  cookDescription: string;
  childDescription: string;
  phase: PhaseKey;
  variant: Variant;
  cookVariant: Variant;

  onClose: () => void;
  onShowAccident: () => void;
  onHideAccident?: () => void;

  accidentInfo: string;
  showAccidentInfo: boolean;
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

export default function OcrBottomDrawer({
  selectedText,
  cookDescription,
  childDescription,
  phase,
  variant,
  cookVariant,
  onClose,
  onShowAccident,
  onHideAccident,
  accidentInfo,
  showAccidentInfo,
  cookEditor,
}: Props) {
  return (
    <BottomDrawer
      openText={selectedText}
      cookDescription={cookDescription}
      childDescription={childDescription}
      phase={phase}
      variant={variant}
      cookVariant={cookVariant}
      onClose={onClose}
      onShowAccidentInfo={onShowAccident}
      onHideAccidentInfo={onHideAccident}
      accidentInfo={accidentInfo}
      showAccidentInfo={showAccidentInfo}
      cookEditor={cookEditor}
    />
  );
}
