"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type EditModalProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function EditModal({ title, onClose, children }: EditModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-2xl border-t-[3px] border-[#B79074] bg-[#FFFDF8] p-5 shadow-2xl sm:rounded-2xl sm:border-[3px]"
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#E6D7C8] pb-3">
          <h3 className="text-lg font-bold text-[#5C3A2E]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-[#765B49] hover:bg-[#F0E4D8]"
            aria-label="編集を閉じる"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
