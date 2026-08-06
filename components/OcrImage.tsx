// components/OcrImage.tsx
"use client";
import * as React from "react";
import type { PhaseKey } from "@/types/food";

type Vertex = { x: number; y: number };
type OCRBox = { description: string; boundingPoly: { vertices: Vertex[] } };

type Variant = "forbidden" | "ok" | "none" | "child" | "forbidden_child" | "ok_child";

type ScaleObj = { scale: number; offsetX?: number; offsetY?: number };

type Props = {
  imgSrc: string;
  boxes: OCRBox[];
  // number でも {scale, offsetX, offsetY} でも受け付ける（useOCR 両対応）
  scale?: number | ScaleObj;
  phase: PhaseKey;
  onImgLoad?: React.ReactEventHandler<HTMLImageElement>;
  filter?: (b: OCRBox) => boolean;
  onPick?: (text: string) => void;
  getBoxVariant?: (b: OCRBox) => Variant;
};

export default function OcrImage({
  imgSrc,
  boxes,
  scale,
  onImgLoad,
  filter,
  onPick,
  getBoxVariant,
}: Props) {
  const filtered = React.useMemo(() => {
    return (boxes || []).filter((b) => (filter ? filter(b) : true));
  }, [boxes, filter]);

  const s = typeof scale === "number" ? (Number.isFinite(scale) ? scale : 1) : (scale?.scale ?? 1);
  const ox = typeof scale === "number" ? 0 : (scale?.offsetX ?? 0);
  const oy = typeof scale === "number" ? 0 : (scale?.offsetY ?? 0);
  const getRect = (vs: Vertex[]) => {
    if (!Array.isArray(vs) || vs.length < 4) return null;

    const xs = vs.map((v) => Number(v?.x));
    const ys = vs.map((v) => Number(v?.y));
    if (xs.some((n) => !Number.isFinite(n)) || ys.some((n) => !Number.isFinite(n))) return null;

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const width = (maxX - minX) * s ;
    const height = (maxY - minY) * s *1.2;
    const left = minX * s + ox;
    const top = minY * s + oy;

    if (
      !Number.isFinite(width) || !Number.isFinite(height) ||
      !Number.isFinite(left) || !Number.isFinite(top) ||
      width <= 0 || height <= 0
    ) return null;

    return { left, top, width, height };
  };

  const variantToClass = (v: Variant) => {
    switch (v) {
      case "forbidden":
        return "border-2 border-red-500";
      case "ok":
        return "border-2 border-yellow-500";
      case "child":
        return "border-2 border-red-500";
      case "forbidden_child":
        return "border-2 border-red-500 ring-2 ring-red-500";
      case "ok_child":
        return "border-2 border-yellow-500 ring-2 ring-red-500";
      default:
        return "border-2 border-transparent";
    }
  };

  return (
    <div className="relative inline-block">
      <img src={imgSrc} alt="" onLoad={onImgLoad} />
      {/* Overlay（クリックできるよう pointer-events 無効化しない） */}
      <div className="absolute inset-0">
        {filtered.map((b, i) => {
          const rect = getRect(b.boundingPoly?.vertices || []);
          if (!rect) return null;

          const variant = getBoxVariant ? getBoxVariant(b) : "ok";
          const className = variantToClass(variant);

          return (
            <button
              key={i}
              type="button"
              className={`absolute ${className} rounded-sm`}
              style={rect}
              onClick={() => onPick?.(b.description)}
              aria-label={b.description}
            />
          );
        })}
      </div>
    </div>
  );
}
