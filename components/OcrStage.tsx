/**
 * OcrStage
 *
 * Stage component that displays the OCR target image and the detected
 * text regions (boxes).
 *
 * - Image zoom/pan operation (react-zoom-pan-pinch)
 * - Displays OCR text regions and detects taps
 * - Phase selection UI (Checklist)
 * - "Use a different image" action
 *
 * Holds no OCR processing or text classification logic;
 * only handles display control and notifying user actions.
 **/

"use client";

import React from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import OcrImage from "@/components/OcrImage";
import type { PhaseKey } from "@/types/food";
import type { ComponentProps } from "react";

type OcrImageProps = ComponentProps<typeof OcrImage>;
type Box = OcrImageProps["boxes"][number];
type ScaleInfo = OcrImageProps["scale"];

type Variant = "forbidden" | "ok" | "none" | "child" | "forbidden_child" | "ok_child";

type Props = {
  imgSrc: string;
  boxes: Box[];
  loading: boolean;
  scale: ScaleInfo;
  phase: PhaseKey;

  drawerOpen: boolean;

  onImgLoad: OcrImageProps["onImgLoad"];
  filterBox: (b: Box) => boolean;
  getVariant: (b: Box) => Variant;

  onPickText: (text: string) => void;
  onReset: () => void;
};

export default function OcrStage({
  imgSrc,
  boxes,
  loading,
  scale,
  phase,
  drawerOpen,
  onImgLoad,
  filterBox,
  getVariant,
  onPickText,
  onReset,
}: Props) {
  return (
    <div className="relative flex flex-col flex-grow h-[calc(100svh-var(--ribbon-h))] px-3">
      <div
        className={`relative flex-grow transition-transform duration-500 will-change-transform ${
          drawerOpen ? "-translate-y-[var(--ribbon-shift)]" : "translate-y-0"
        }`}
        aria-busy={loading}
      >
        <div className="absolute inset-0">
          <TransformWrapper doubleClick={{ disabled: true }} disabled={loading}>
            <TransformComponent wrapperClass="w-full h-full">
              <div className="w-full h-full">
                <OcrImage
                  imgSrc={imgSrc}
                  boxes={boxes}
                  scale={scale}
                  phase={phase}
                  onImgLoad={onImgLoad}
                  filter={filterBox}
                  onPick={onPickText}
                  getBoxVariant={getVariant}
                />
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bottom-4 z-40 flex justify-center pointer-events-none">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center rounded-lg 
                       px-6 py-2 text-sm font-medium 
                       bg-[#CBB9AB] hover:bg-[#B8A598] text-[#3A2C25] 
                       border border-[#BCAAA0] 
                       shadow-md backdrop-blur-sm bg-white/85 
                       pointer-events-auto"
          >
            Use a different image
          </button>
        </div>
      </div>
    </div>
  );
}
