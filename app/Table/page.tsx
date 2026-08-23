"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Ribbon from "@/components/Ribbon";
import { authedFetch } from "@/lib/apiFetch";

type Answer = {
  id: string;
  child_name: string;
  age_month: number;
  no_eat: string;
  can_eat?: boolean | null;
  note: string | null;
  created_at: string;
};

type MealRecord = {
  id: string;
  child_name: string;
  age_month: number;
  record_type: "growth" | "hiyari";
  food_name: string;
  detail: string;
  created_at: string;
};

type ChildSummary = {
  name: string;
  ages: number[];
  noEat: Answer[];
  meals: MealRecord[];
};

const uniqueSortedAges = (values: number[]) => {
  const filtered = values.filter((age) => Number.isFinite(age));
  const unique = Array.from(new Set(filtered));
  return unique.sort((a, b) => a - b);
};

export default function Page5() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [mealRecords, setMealRecords] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (typeof window === "undefined") return;
        const loggedIn = localStorage.getItem("yochiLoggedIn") === "true";
        const storedMemberId = localStorage.getItem("yochiMemberId");
        if (!loggedIn || !storedMemberId) {
          router.replace("/login");
          return;
        }
        setMemberId(storedMemberId);
        setAuthChecked(true);

        const [answersRes, mealsRes] = await Promise.all([
          authedFetch(`/api/enji-info`, { cache: "no-store" }),
          authedFetch(`/api/meal-records?limit=200`, { cache: "no-store" }),
        ]);

        if (!answersRes.ok || !mealsRes.ok) throw new Error("fetch failed");

        const answersJson = await answersRes.json();
        const mealsJson = await mealsRes.json();
        setAnswers(Array.isArray(answersJson) ? answersJson : answersJson.items ?? []);
        setMealRecords(Array.isArray(mealsJson) ? mealsJson : mealsJson.items ?? []);
      } catch {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const grouped = useMemo(() => {
    const map = new Map<string, ChildSummary>();

    const ensureChild = (rawName: string) => {
      const name = rawName?.trim() || "No name entered";
      if (!map.has(name)) {
        map.set(name, { name, ages: [], noEat: [], meals: [] });
      }
      return map.get(name)!;
    };

    for (const item of answers) {
      const child = ensureChild(item.child_name);
      if (item.no_eat.trim().length > 0 && item.can_eat !== true) {
        child.noEat.push(item);
      }
      if (Number.isFinite(item.age_month)) child.ages.push(item.age_month);
    }

    for (const item of mealRecords) {
      const child = ensureChild(item.child_name);
      child.meals.push(item);
      if (Number.isFinite(item.age_month)) child.ages.push(item.age_month);
    }

    return Array.from(map.values())
      .map((child) => ({
        ...child,
        ages: uniqueSortedAges(child.ages),
        noEat: [...child.noEat].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        meals: [...child.meals].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [answers, mealRecords]);

  if (!authChecked) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#FAF8F6] text-[#4D3F36] relative">
      <Ribbon
        href="/"
        logoSrc="/yoyochi3-ribbon.png"
        alt="Yochiyochi logo"
        heightClass="h-20"
        bgClass="bg-[#F0E4D8]"
        logoClassName="h-[4.5rem] w-auto object-contain"
      />
      <div className="pt-20 px-6 pb-10">
        <h1 className="text-xl font-bold mb-4">Child Information</h1>

        {loading && <p className="text-[#6B5A4E]">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="space-y-6">
            {grouped.map((child) => {
              const growth = child.meals.filter((item) => item.record_type === "growth");
              const hiyari = child.meals.filter((item) => item.record_type === "hiyari");
              const ageLabel = child.ages.length > 0 ? child.ages.join(", ") : "-";

              return (
                <section
                  key={child.name}
                  className="bg-white rounded-2xl border border-[#E8DCD0] shadow-md p-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-bold text-[#5C3A2E]">
                      Child: {child.name}
                    </h2>
                    <span className="text-sm text-[#6B5A4E]">Age (months): {ageLabel}</span>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[#6B5A4E]">
                        Foods they can&apos;t eat
                      </h3>
                      {child.noEat.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {child.noEat.map((item) => (
                            <li
                              key={item.id}
                              className="rounded-xl border border-[#EFE2D6] bg-[#FFF9F5] p-3"
                            >
                              <div className="text-sm font-semibold text-[#4D3F36]">
                                {item.no_eat}
                              </div>
                              {item.note && (
                                <div className="text-xs text-[#6B5A4E] mt-1">
                                  Note: {item.note}
                                </div>
                              )}
                              <div className="text-xs text-[#8A776A] mt-1">
                                {new Date(item.created_at).toLocaleString()}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-[#8A776A]">Nothing registered.</p>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-[#6B5A4E]">Growth Log</h3>
                      {growth.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {growth.map((item) => (
                            <li
                              key={item.id}
                              className="rounded-xl border border-[#EFE2D6] bg-[#F9F5FF] p-3"
                            >
                              <div className="text-sm font-semibold text-[#4D3F36]">
                                {item.food_name}
                              </div>
                              <div className="text-sm text-[#6B5A4E] mt-1">
                                {item.detail}
                              </div>
                              <div className="text-xs text-[#8A776A] mt-1">
                                {new Date(item.created_at).toLocaleString()}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-[#8A776A]">No records yet.</p>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-[#6B5A4E]">Incidents</h3>
                      {hiyari.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {hiyari.map((item) => (
                            <li
                              key={item.id}
                              className="rounded-xl border border-[#EFE2D6] bg-[#FDF0F0] p-3"
                            >
                              <div className="text-sm font-semibold text-[#4D3F36]">
                                {item.food_name}
                              </div>
                              <div className="text-sm text-[#6B5A4E] mt-1">
                                {item.detail}
                              </div>
                              <div className="text-xs text-[#8A776A] mt-1">
                                {new Date(item.created_at).toLocaleString()}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-[#8A776A]">No records yet.</p>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}

            {grouped.length === 0 && (
              <div className="rounded-2xl border border-[#E8DCD0] bg-white p-6 text-center text-[#8A776A]">
                No data registered.
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#D6C2B4] bg-[#F5EDE6] px-5 py-2 font-semibold text-[#6B5A4E] shadow-sm transition hover:bg-[#E7DBCF]"
          >
            Back to Home
          </Link>
          <Link
            href="/Register"
            className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2 font-semibold text-white shadow-sm transition hover:bg-brand-hover"
          >
            Back to Nursery Records
          </Link>
        </div>
      </div>
    </main>
  );
}

