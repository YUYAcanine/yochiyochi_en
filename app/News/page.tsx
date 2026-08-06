"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Ribbon from "@/components/Ribbon";

type NewsItem = {
  id: number;
  food_name: string;
  accident_content: string | null;
  created_at: string;
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
        setItems(Array.isArray(json) ? json : json.items ?? []);
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
        logoSrc="/yoyochi.jpg"
        alt="よちヨチ ロゴ"
        heightClass="h-24"
        bgClass="bg-[#F0E4D8]"
        logoClassName="h-20 w-auto object-contain"
      />

      <div className="pt-24 px-6 pb-10 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-[#5C3A2E]">ヒヤリハット事例</h1>
          <span className="text-xs font-semibold text-[#8A776A]">
            ヒヤリハット情報
          </span>
        </div>

        {loading && <p className="text-[#6B5A4E]">読み込み中...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="rounded-2xl border border-[#E8DCD0] bg-white shadow-md p-4">
            {items.length > 0 ? (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-[#E8DCD0] bg-[#FFF9F5] p-3"
                  >
                    <div className="text-sm font-semibold text-[#4D3F36]">
                      {item.food_name}
                    </div>
                    {item.accident_content && (
                      <p className="text-sm text-[#6B5A4E] mt-1">
                        {item.accident_content}
                      </p>
                    )}
                    <div className="text-xs text-[#8A776A] mt-2">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
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


