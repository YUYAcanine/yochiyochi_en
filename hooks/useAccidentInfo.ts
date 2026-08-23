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
  const [loadingAccidentInfo, setLoadingAccidentInfo] = useState<boolean>(false);

  const reset = useCallback(() => {
    setAccidentInfo("");
    setShowAccidentInfo(false);
    setLoadingAccidentInfo(false);
  }, []);

  // Because of RLS, only public rows (is_public=true) and this nursery's own rows
  // (garden_id) are returned. When not logged in, only is_public=true rows can be fetched.
  const fetchByFoodId = useCallback(async (foodId: number | null) => {
    if (!foodId) {
      setAccidentInfo("Accident information not found.");
      setShowAccidentInfo(true);
      return;
    }

    setLoadingAccidentInfo(true);
    setShowAccidentInfo(true);
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
          sections.push(`Accident information\n${generalLines}`);
        }

        const gardenLines = gardenRows
          .map((row, i) => `${i + 1}. ${row.content ?? ""}`.trim())
          .filter(Boolean)
          .join("\n");
        if (gardenLines) {
          sections.push(`Incidents\n${gardenLines}`);
        }
      }

      setAccidentInfo(sections.length === 0 ? "Accident information not found." : sections.join("\n\n"));
    } catch (e) {
      console.error("useAccidentInfo error:", e);
      setAccidentInfo("Failed to fetch accident information.");
    } finally {
      setLoadingAccidentInfo(false);
    }
  }, []);

  return { accidentInfo, showAccidentInfo, loadingAccidentInfo, fetchByFoodId, reset };
}
