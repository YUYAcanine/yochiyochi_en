"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AccidentRow = {
  content: string | null;
  garden_id: string | null;
  created_at: string;
};

export function useAccidentInfo() {
  const [accidentInfo, setAccidentInfo] = useState<string>("");
  const [showAccidentInfo, setShowAccidentInfo] = useState<boolean>(false);

  const reset = useCallback(() => {
    setAccidentInfo("");
    setShowAccidentInfo(false);
  }, []);

  // RLSにより、公開(is_public=true)の行と自園(garden_id)の行だけが返る。
  // ログインしていない場合はis_public=trueの行のみ取得できる。
  const fetchByFoodId = useCallback(async (foodId: number | null) => {
    if (!foodId) {
      setAccidentInfo("事故情報が見つかりません。");
      setShowAccidentInfo(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("accidents")
        .select("content, garden_id, created_at")
        .eq("food_id", foodId)
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<AccidentRow[]>();

      const sections: string[] = [];

      if (!error && data) {
        const generalRows = data.filter((row) => row.garden_id === null);
        const gardenRows = data.filter((row) => row.garden_id !== null).slice(0, 5);

        const generalLines = generalRows
          .map((row, i) => `${i + 1}. ${row.content ?? ""}`.trim())
          .filter(Boolean)
          .join("\n\n");
        if (generalLines) {
          sections.push(`事故情報\n${generalLines}`);
        }

        const gardenLines = gardenRows
          .map((row, i) => `${i + 1}. ${row.content ?? ""}`.trim())
          .filter(Boolean)
          .join("\n");
        if (gardenLines) {
          sections.push(`ヒヤリハット\n${gardenLines}`);
        }
      }

      setAccidentInfo(sections.length === 0 ? "事故情報が見つかりません。" : sections.join("\n\n"));
      setShowAccidentInfo(true);
    } catch (e) {
      console.error("useAccidentInfo error:", e);
      setAccidentInfo("事故情報の取得に失敗しました。");
      setShowAccidentInfo(true);
    }
  }, []);

  return { accidentInfo, showAccidentInfo, fetchByFoodId, reset };
}
