/**
 * OcrBottomDrawer
 *
 * Bottom drawer that shows a description for text selected via OCR.
 *
 * - Shows phase-specific caution notes
 * - Provides a button to show incident info
 *
 * This component holds no state of its own;
 * all displayed content and open/close control are received via props.
 * It wraps the existing BottomDrawer component.
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
  loadingAccidentInfo?: boolean;
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
  loadingAccidentInfo,
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
      loadingAccidentInfo={loadingAccidentInfo}
      cookEditor={cookEditor}
    />
  );
}
