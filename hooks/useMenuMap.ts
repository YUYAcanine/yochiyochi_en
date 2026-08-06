// hooks/useMenuMap.ts
"use client";
import Papa from "papaparse";
import { useEffect, useState } from "react";
import { canon } from "@/lib/textNormalize";
import type { ParsedRow, FoodMap } from "@/types/food";

export function useMenuMap(csvPath = "/nagasakidemo.csv") {
  const [menuMap, setMenuMap] = useState<FoodMap>({});

  useEffect(() => {
    let cancelled = false;
    fetch(csvPath)
      .then((r) => r.text())
      .then((csv) =>
        Papa.parse<ParsedRow>(csv, {
          header: true,
          complete: (res) => {
            if (cancelled) return;
            const map: FoodMap = {};
            res.data.forEach((row) => {
              const key = canon(row.food_name);
              if (!key) return;

              const next = {
                phase1: row.description_phase1?.trim(),
                phase2: row.description_phase2?.trim(),
                phase3: row.description_phase3?.trim(),
                phase4: row.description_phase4?.trim(),
                phase5: row.description_phase5?.trim(),
              };

              // 既存値があれば上書きしない（先勝ち）
              map[key] = {
                phase1: map[key]?.phase1 ?? next.phase1,
                phase2: map[key]?.phase2 ?? next.phase2,
                phase3: map[key]?.phase3 ?? next.phase3,
                phase4: map[key]?.phase4 ?? next.phase4,
                phase5: map[key]?.phase5 ?? next.phase5,
              };
            });
            setMenuMap(map);
          },
        })
      )
      .catch(() => setMenuMap({}));

    return () => {
      cancelled = true;
    };
  }, [csvPath]);

  return menuMap;
}
