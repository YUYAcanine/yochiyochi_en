// types/food.ts
export type PhaseKey = "phase1" | "phase2" | "phase3" | "phase4" | "phase5";

export type ParsedRow = {
  food_name: string;
  description_phase1?: string;
  description_phase2?: string;
  description_phase3?: string;
  description_phase4?: string;
  description_phase5?: string;
};

export type FoodMap = Record<
  string,
  Partial<Record<PhaseKey, string | undefined>>
>;
