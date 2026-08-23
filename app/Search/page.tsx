"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { canon } from "@/lib/textNormalize";
import Ribbon from "@/components/Ribbon";
import BottomDrawer from "@/components/BottomDrawer";
import PhaseSelectDropdown from "@/components/PhaseSelectDropdown";
import { PHASE_LABELS } from "@/components/checklist";
import { useMenuData } from "@/hooks/useMenuData";
import { useAccidentInfo } from "@/hooks/useAccidentInfo";
import { trackGaEvent } from "@/lib/ga";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentGardenId } from "@/lib/currentGarden";
import type { PhaseKey } from "@/types/food";

type Variant = "forbidden" | "ok" | "none" | "child" | "forbidden_child" | "ok_child";
type CookVariant = "forbidden" | "ok" | "none";
type MenuInfo = Partial<Record<PhaseKey, string>>;

type FoodItem = MenuInfo & {
  food_name: string;
};

type ChildFoodItem = {
  child_name: string;
  no_eat: string;
  can_eat: boolean | null;
  note: string | null;
};

type AccidentFoodItem = {
  child_name: string;
  food_name: string;
  content: string;
};

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [phase, setPhase] = useState<PhaseKey>("phase1");
  const [isClient, setIsClient] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [enjiFoodItems, setEnjiFoodItems] = useState<ChildFoodItem[]>([]);
  const [accidentFoodItems, setAccidentFoodItems] = useState<AccidentFoodItem[]>([]);

  const { menuMap, foodIdMap, canonicalNameMap } = useMenuData();
  const { accidentInfo, showAccidentInfo, loadingAccidentInfo, fetchByFoodId, reset } = useAccidentInfo();

  const buildMatchedFoods = (rawQuery: string, limit?: number): FoodItem[] => {
    const trimmed = rawQuery.trim();
    if (!trimmed) return [];

    const query = canon(trimmed);
    const results: FoodItem[] = [];
    const seen = new Set<string>();

    for (const [key, value] of Object.entries(menuMap)) {
      if (key.includes(query) || query.includes(key)) {
        const displayName = canonicalNameMap[key] ?? key;
        const resultKey = String(foodIdMap[key] ?? displayName);
        if (seen.has(resultKey)) continue;
        seen.add(resultKey);
        results.push({
          food_name: displayName,
          ...value,
        });
      }
    }

    return typeof limit === "number" ? results.slice(0, limit) : results;
  };

  const liveSuggestions = useMemo(() => buildMatchedFoods(searchQuery, 8), [searchQuery, menuMap]);

  useEffect(() => {
    setIsClient(true);
    const storedMemberId = localStorage.getItem("yochiMemberId");
    setMemberId(storedMemberId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchEnjiFoodItems = async () => {
      const gardenId = await getCurrentGardenId();
      if (!gardenId) {
        if (!cancelled) setEnjiFoodItems([]);
        return;
      }

      const { data: childRows } = await supabase
        .from("children")
        .select("id, name")
        .eq("garden_id", gardenId)
        .returns<Array<{ id: string; name: string | null }>>();

      const childIds = (childRows ?? []).map((row) => row.id);
      const childNameMap = new Map((childRows ?? []).map((row) => [row.id, row.name?.trim() ?? ""]));

      if (childIds.length === 0) {
        if (!cancelled) setEnjiFoodItems([]);
      } else {
        const { data: restrictionRows, error: restrictionError } = await supabase
          .from("child_food_restrictions")
          .select("child_id, cannot_eat, note, foods(name)")
          .in("child_id", childIds)
          .returns<
            Array<{
              child_id: string;
              cannot_eat: boolean;
              note: string | null;
              foods: { name: string | null } | null;
            }>
          >();

        if (!restrictionError && restrictionRows && !cancelled) {
          const nextItems: ChildFoodItem[] = restrictionRows
            .map((row): ChildFoodItem | null => {
              const foodName = row.foods?.name?.trim() ?? "";
              if (!foodName) return null;
              return {
                child_name: childNameMap.get(row.child_id) ?? "",
                no_eat: foodName,
                can_eat: !row.cannot_eat,
                note: row.note ?? null,
              };
            })
            .filter((item): item is ChildFoodItem => item !== null);

          setEnjiFoodItems(nextItems);
        }
      }

      const { data: accidentRows, error: accidentError } = await supabase
        .from("accidents")
        .select("child_id, content, foods(name)")
        .eq("garden_id", gardenId)
        .returns<
          Array<{
            child_id: string | null;
            content: string | null;
            foods: { name: string | null } | null;
          }>
        >();

      if (!accidentError && accidentRows && !cancelled) {
        const nextAccidents: AccidentFoodItem[] = accidentRows
          .map((row): AccidentFoodItem | null => {
            const foodName = row.foods?.name?.trim() ?? "";
            const content = row.content?.trim() ?? "";
            if (!foodName || !content) return null;
            return {
              child_name: row.child_id ? childNameMap.get(row.child_id) ?? "" : "",
              food_name: foodName,
              content,
            };
          })
          .filter((item): item is AccidentFoodItem => item !== null);

        setAccidentFoodItems(nextAccidents);
      }
    };

    fetchEnjiFoodItems();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const childFoodMap = useMemo(() => {
    const map = new Map<string, Array<{ name: string; note: string | null; canEat: boolean }>>();
    for (const child of enjiFoodItems) {
      const items = (child.no_eat ?? "")
        .split(/[,\s/\u3001\u30fb\uFF0C\uFF0F]+/)
        .map((item) => canon(item))
        .filter(Boolean);
      const uniqueItems = Array.from(new Set(items));
      for (const item of uniqueItems) {
        const list = map.get(item) ?? [];
        list.push({ name: child.child_name, note: child.note ?? null, canEat: child.can_eat === true });
        map.set(item, list);
      }
    }
    return map;
  }, [enjiFoodItems]);

  const accidentFoodMap = useMemo(() => {
    const map = new Map<string, Array<{ name: string; content: string }>>();
    for (const item of accidentFoodItems) {
      const key = canon(item.food_name);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push({ name: item.child_name, content: item.content });
      map.set(key, list);
    }
    return map;
  }, [accidentFoodItems]);

  const getChildEntries = useCallback(
    (raw?: string) => {
      const key = canon(raw);
      if (!key) return null;
      const list = childFoodMap.get(key);
      return list && list.length > 0 ? list : null;
    },
    [childFoodMap]
  );

  const getAccidentEntries = useCallback(
    (raw?: string) => {
      const key = canon(raw);
      if (!key) return null;
      const list = accidentFoodMap.get(key);
      return list && list.length > 0 ? list : null;
    },
    [accidentFoodMap]
  );

  const formatChildNotes = useCallback(
    (
      childEntries: Array<{ name: string; note: string | null; canEat: boolean }> | null,
      accidentEntries: Array<{ name: string; content: string }> | null
    ) => {
      const parts: string[] = [];

      if (childEntries && childEntries.length > 0) {
        const normalized = childEntries
          .map((entry) => ({
            name: (entry.name ?? "").trim(),
            note: (entry.note ?? "").trim(),
            canEat: entry.canEat,
          }))
          .filter((entry) => entry.name.length > 0);

        const lines = normalized.map((entry) => {
          const status = entry.canEat ? "食べられる" : "食べられない";
          const noteText = entry.note ? `（${entry.note}）` : "";
          return `・${entry.name}：${status}${noteText}`;
        });

        if (lines.length > 0) {
          parts.push(`【注意する食材】\n${lines.join("\n")}`);
        }
      }

      if (accidentEntries && accidentEntries.length > 0) {
        const lines = accidentEntries.map((entry) => {
          const name = entry.name?.trim();
          return `・${name ? `${name}：` : ""}${entry.content}`;
        });
        parts.push(`【ヒヤリハット報告】\n${lines.join("\n")}`);
      }

      return parts.join("\n\n");
    },
    []
  );

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const results = buildMatchedFoods(searchQuery);

    setSearchResults(results);
    setHasSearched(true);
    setShowSuggestions(false);
    trackGaEvent("search_food", {
      search_term: searchQuery.trim(),
      result_count: results.length,
    });
  };

  const handleSelectFood = (food: FoodItem, source: "search_result" | "suggestion" = "search_result") => {
    setSelectedFood(food);
    reset();
    trackGaEvent("tap_food", {
      food_name: food.food_name,
      source,
    });
  };

  const handleShowAccidentInfo = async () => {
    if (!selectedFood) return;

    if (showAccidentInfo) {
      reset();
      return;
    }

    const key = canon(selectedFood.food_name);
    const foodId = key ? foodIdMap[key] : null;
    await fetchByFoodId(foodId ?? null);
  };

  const classify = useCallback(
    (food: FoodItem | null): { variant: Variant; cookVariant: CookVariant; cookText: string; childText: string } => {
      if (!food) return { variant: "none", cookVariant: "none", cookText: "", childText: "" };

      const val = food[phase]?.trim();
      const childEntries = getChildEntries(food.food_name);
      const accidentEntries = getAccidentEntries(food.food_name);
      const hasFlag = Boolean(childEntries) || Boolean(accidentEntries);
      const childText = hasFlag ? formatChildNotes(childEntries, accidentEntries) : "";
      const cookVariant: CookVariant = !val ? "none" : "ok";

      if (cookVariant === "none") {
        if (hasFlag) {
          return { variant: "child", cookVariant: "none", cookText: "", childText };
        }
        return { variant: "none", cookVariant: "none", cookText: "", childText: "" };
      }

      if (hasFlag) {
        return {
          variant: "ok_child",
          cookVariant,
          cookText: val ?? "",
          childText,
        };
      }

      return { variant: "ok", cookVariant, cookText: val ?? "", childText: "" };
    },
    [phase, getChildEntries, getAccidentEntries, formatChildNotes]
  );

  const selected = selectedFood
    ? classify(selectedFood)
    : { variant: "none" as Variant, cookVariant: "none" as CookVariant, cookText: "", childText: "" };

  const handleCloseDrawer = () => {
    setSelectedFood(null);
    reset();
  };

  return (
    <main className="min-h-screen bg-[#FAF8F6] text-[#4D3F36] relative flex flex-col">
      <Ribbon
        href="/"
        logoSrc="/yoyochi3-ribbon.png"
        alt="よちヨチ ロゴ"
        heightClass="h-20"
        bgClass="bg-[#F0E4D8]"
        logoClassName="h-[4.5rem] w-auto object-contain"
      />

      <div className="flex-grow pt-20 px-4">
        <div className="max-w-2xl mx-auto">
          <PhaseSelectDropdown
            phase={phase}
            onChangePhase={setPhase}
            labels={PHASE_LABELS}
            className="mb-4 mt-6 flex justify-end"
          />

          <div className="mb-8 mt-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
	                <input
	                  type="text"
	                  value={searchQuery}
	                  onFocus={() => setShowSuggestions(true)}
	                  onBlur={() => setTimeout(() => setShowSuggestions(false), 80)}
	                  onChange={(e) => {
	                    setSearchQuery(e.target.value);
	                    setShowSuggestions(true);
	                    if (hasSearched) setHasSearched(false);
	                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="食材名を入力してください"
                  className="w-full px-4 py-3 pr-10 border border-[#D3C5B9] rounded-xl bg-white text-[#4D3F36] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-brand"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setShowSuggestions(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                    aria-label="入力をクリア"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                {isClient && showSuggestions && searchQuery.trim().length > 0 && liveSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 max-h-64 overflow-y-auto rounded-xl border border-[#D3C5B9] bg-white shadow-lg">
                    {liveSuggestions.map((food, index) => (
                      <button
                        key={`suggest-${food.food_name}-${index}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSearchQuery(food.food_name);
                          setSearchResults(buildMatchedFoods(food.food_name));
                          setHasSearched(true);
                          setShowSuggestions(false);
                          trackGaEvent("tap_food", {
                            food_name: food.food_name,
                            source: "suggestion",
                          });
                        }}
                        className="block w-full border-b border-[#F0E4D8] px-4 py-3 text-left text-sm text-[#4D3F36] hover:bg-[#F8E8E8] last:border-b-0"
                      >
                        {food.food_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleSearch}
                className="px-6 py-3 rounded-xl font-medium transition bg-brand hover:bg-brand-hover text-white"
                aria-label="検索"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {hasSearched && (
            <div className="mb-8">
              {searchResults.length > 0 ? (
                <div>
                  <h2 className="text-base font-semibold text-[#3A2C25] mb-4">検索結果</h2>
                  <div className="space-y-2">
                    {searchResults.map((food, index) => {
                      const flagged = Boolean(getChildEntries(food.food_name)) || Boolean(getAccidentEntries(food.food_name));
                      return (
                        <button
                          key={`${food.food_name}-${index}`}
                          onClick={() => handleSelectFood(food, "search_result")}
                          className={`w-full p-4 text-left rounded-xl transition text-[#4D3F36] ${
                            flagged
                              ? "bg-white border-2 border-red-500 hover:bg-red-50"
                              : "bg-white border border-[#D3C5B9] hover:bg-[#F8E8E8]"
                          }`}
                        >
                          {food.food_name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#6B7280] text-base">検索結果がありません。</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomDrawer
        openText={selectedFood?.food_name || ""}
        cookDescription={selected.cookText}
        childDescription={selected.childText}
        phase={phase}
        variant={selected.variant}
        cookVariant={selected.cookVariant}
        onClose={handleCloseDrawer}
        onShowAccidentInfo={handleShowAccidentInfo}
        accidentInfo={accidentInfo}
        showAccidentInfo={showAccidentInfo}
        loadingAccidentInfo={loadingAccidentInfo}
      />
    </main>
  );
}
