"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Ribbon from "@/components/Ribbon";

type NewsItem = {
  id: number;
  food_name: string;
  accident_content: string | null;
  created_at: string;
  from_garden: boolean;
};

const shuffle = <T,>(values: T[]): T[] => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/accidents?public=true&limit=200", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        if (cancelled) return;
        const fetched: NewsItem[] = Array.isArray(json) ? json : json.items ?? [];
        // 保育園からの報告は新着順のまま、それ以外(事前登録データ)はランダムな順番で表示する
        const gardenItems = fetched.filter((item) => item.from_garden);
        const otherItems = shuffle(fetched.filter((item) => !item.from_garden));
        setItems([...gardenItems, ...otherItems]);
      } catch {
        if (!cancelled) setError("新着ニュースの取得に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNews();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#FAF8F6] text-[#4D3F36] relative">
      <Ribbon
        href="/"
        logoSrc="/yoyochi3-ribbon.png"
        alt="よちヨチ ロゴ"
        heightClass="h-24"
        bgClass="bg-[#F0E4D8]"
        logoClassName="h-[5.5rem] w-auto object-contain"
      />

      <div className="pt-32 px-6 pb-10 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#5C3A2E]">ヒヤリハット事例</h1>
        </div>

        {loading && <p className="text-[#6B5A4E]">読み込み中...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="rounded-2xl border border-[#E8DCD0] bg-white shadow-md p-4 sm:p-6">
            {items.length > 0 ? (
              <ul className="space-y-4">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-[#E8DCD0] bg-[#FFF9F5] p-4"
                  >
                    <div className="text-sm font-semibold text-[#4D3F36]">
                      {item.food_name}
                    </div>
                    {item.accident_content && (
                      <p className="text-sm text-[#6B5A4E] mt-2 leading-relaxed">
                        {item.accident_content}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#6B5A4E]">
                新しいヒヤリハットはありません。
              </p>
            )}
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#D6C2B4] bg-[#F5EDE6] px-5 py-2 font-semibold text-[#6B5A4E] shadow-sm transition hover:bg-[#E7DBCF]"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}


