// hooks/useOCR.ts
"use client";

import { useEffect, useState } from "react";

export type Vertex = { x: number; y: number };
export type BoundingBox = { description: string; boundingPoly: { vertices: Vertex[] } };

/**
 * 画像 → Vision API OCR → BoundingBox 配列
 * object-contain の余白を考慮するため、等倍 scale と offsetX/offsetY を返す
 */
export function useOCR(imgSrc: string | null) {
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [loading, setLoading] = useState(false);

  // ★ 等倍スケール + レターボックス余白
  const [scale, setScale] = useState<{ scale: number; offsetX: number; offsetY: number }>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  useEffect(() => {
    const run = async () => {
      if (!imgSrc) return;
      setLoading(true);
      try {
        const base64 = imgSrc.includes(",") ? imgSrc.split(",")[1] : imgSrc;
        const res = await fetch("/api/vision-ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        const json = await res.json();
        const anns =
          (json?.responses?.[0]?.textAnnotations ?? []) as Array<{
            description: string;
            boundingPoly: { vertices: Array<{ x?: number; y?: number }> };
          }>;

        const next: BoundingBox[] = anns.slice(1).map((a) => ({
          description: a.description,
          boundingPoly: {
            vertices: a.boundingPoly.vertices.map((v) => ({
              x: v.x ?? 0,
              y: v.y ?? 0,
            })),
          },
        }));

        setBoxes(next);
      } catch (e) {
        console.error("OCR error:", e);
        setBoxes([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [imgSrc]);

  /** object-contain と同じ計算で、scale と左右/上下の余白を算出 */
  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const nw = el.naturalWidth || 1;
    const nh = el.naturalHeight || 1;

    const s = Math.min(cw / nw, ch / nh); // 収まる倍率
    const dw = nw * s;
    const dh = nh * s;

    setScale({
      scale: s,
      offsetX: (cw - dw) / 2,
      offsetY: (ch - dh) / 2,
    });
  };

  return { boxes, loading, scale, onImgLoad };
}
