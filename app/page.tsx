"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type IconType = "search" | "edit";

const shuffle = <T,>(values: T[]): T[] => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

function ButtonIcon({ type }: { type: IconType }) {
  if (type === "search") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5 flex-none"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21h6" />
      <path d="M4 17.5L16.8 4.7a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L7.3 20.8 4 21z" />
    </svg>
  );
}

export default function Page1() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [hiyariNews, setHiyariNews] = useState<
    Array<{
      id: number;
      food_name: string;
      accident_content: string | null;
      created_at: string;
      from_garden: boolean;
      isNew: boolean;
    }>
  >([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncLoginState = () => {
      const stored = localStorage.getItem("yochiLoggedIn") === "true";
      setIsLoggedIn(stored);
      setMemberId(localStorage.getItem("yochiMemberId"));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "yochiLoggedIn" || event.key === "yochiMemberId") {
        syncLoginState();
      }
    };

    const handleAuthChanged = () => {
      syncLoginState();
    };

    syncLoginState();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("yochi-auth-changed", handleAuthChanged);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("yochi-auth-changed", handleAuthChanged);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const fetchNews = async () => {
      setNewsLoading(true);
      setNewsError(null);
      try {
        const res = await fetch("/api/accidents?public=true&limit=50", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        if (cancelled) return;
        const fetched: Array<{
          id: number;
          food_name: string;
          accident_content: string | null;
          created_at: string;
          from_garden: boolean;
        }> = Array.isArray(json) ? json : json.items ?? [];

        // API側で新着順に並んでいるので、保育園からの報告(from_garden)はそのまま先頭が最新になる
        const gardenItems = fetched.filter((item) => item.from_garden);
        const otherItems = shuffle(fetched.filter((item) => !item.from_garden));

        let combined: Array<{
          id: number;
          food_name: string;
          accident_content: string | null;
          created_at: string;
          from_garden: boolean;
          isNew: boolean;
        }>;

        if (gardenItems.length > 0) {
          const newest = gardenItems.slice(0, 2).map((item) => ({ ...item, isNew: true }));
          const fillCount = 3 - newest.length;
          const filler = otherItems.slice(0, fillCount).map((item) => ({ ...item, isNew: false }));
          combined = [...newest, ...filler];
        } else {
          combined = otherItems.slice(0, 3).map((item) => ({ ...item, isNew: false }));
        }

        setHiyariNews(combined);
      } catch {
        if (!cancelled) setNewsError("新着ニュースの取得に失敗しました");
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    };

    fetchNews();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    if (typeof window === "undefined") return;
    void supabase.auth.signOut();
    localStorage.setItem("yochiLoggedIn", "false");
    localStorage.removeItem("yochiMemberId");
    window.dispatchEvent(new Event("yochi-auth-changed"));
    setIsLoggedIn(false);
    setMemberId(null);
    setShowAccountMenu(false);
    router.replace("/");
  };

  return (
    <main className="min-h-screen bg-[#FFFDF8] px-4 py-6 text-[#2e2a28] sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-0.5 flex justify-end">
          {!isLoggedIn ? (
            <Link
              href="/login"
              className="rounded-md border-2 border-[#cda982] bg-[#f6f2ee] px-5 py-2 text-sm font-bold text-[#4b4038] hover:opacity-85"
            >
              ログイン
            </Link>
          ) : (
            <div className="flex flex-col items-end gap-2">
              {memberId && (
                <span className="text-xs font-semibold text-[#3c3733] sm:text-sm">
                  {memberId}さんのページ
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowAccountMenu(true)}
                className="rounded-md border-2 border-[#cda982] bg-[#f6f2ee] px-6 py-1 text-xs font-bold text-[#4b4038] hover:opacity-85 sm:text-sm"
              >
                ログアウト
              </button>
            </div>
          )}
        </div>

        {showAccountMenu && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setShowAccountMenu(false)}
          >
            <div
              className="flex w-full max-w-xs flex-col gap-3 rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-md border-2 border-[#cda982] bg-[#f6f2ee] px-6 py-2 text-sm font-bold text-[#4b4038] hover:opacity-85"
              >
                ログアウト
              </button>
              <Link
                href="/account/delete"
                className="w-full rounded-md border-2 border-red-300 bg-[#f6f2ee] px-6 py-2 text-center text-sm font-bold text-red-700 hover:opacity-85"
              >
                アカウント削除
              </Link>
              <button
                type="button"
                onClick={() => setShowAccountMenu(false)}
                className="text-xs font-semibold text-[#6d6055] hover:opacity-70"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        <div className="mb-2 select-none sm:mb-3">
          <Image
            src="/yoyochi3.png"
            alt="よちヨチ ロゴ"
            width={960}
            height={360}
            priority
            className="mx-auto h-auto w-full max-w-3xl"
          />
        </div>

        <div className="mb-10 grid grid-cols-2 gap-4 sm:mb-12 sm:gap-6">
          <Link
            href="/Select"
            className="flex items-center justify-center gap-2 rounded-3xl bg-brand px-3 py-4 text-white hover:brightness-105 sm:gap-3"
          >
            <ButtonIcon type="search" />
            <span className="text-base font-semibold leading-none sm:text-2xl">
              献立チェック
            </span>
          </Link>
          {isLoggedIn ? (
            <Link
              href="/Register"
              className="flex items-center justify-center gap-2 rounded-3xl bg-brand px-3 py-4 text-white hover:brightness-105 sm:gap-3"
            >
              <ButtonIcon type="edit" />
              <span className="text-base font-semibold leading-none sm:text-2xl">
                保育園ページ
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              aria-label="保育園ページ（ログインが必要です）"
              title="ログインすると利用できます"
              className="flex items-center justify-center gap-2 rounded-3xl bg-[#4b4b4b] px-3 py-4 text-[#d8d8d8] opacity-75 hover:brightness-105 sm:gap-3"
            >
              <ButtonIcon type="edit" />
              <span className="text-base font-semibold leading-none sm:text-2xl">
                保育園ページ
              </span>
            </Link>
          )}
        </div>

        <div className="rounded-lg border-[3px] border-[#d4b08d] bg-[#F0E4D8] p-3 sm:p-4">
          <h2 className="mb-3 text-base font-semibold text-[#38322f] sm:text-lg">
            ヒヤリハット一覧
          </h2>

          {newsLoading && <p className="text-sm text-[#6d6055] sm:text-base">読み込み中...</p>}
          {newsError && <p className="text-sm text-red-600 sm:text-base">{newsError}</p>}

          {!newsLoading && !newsError && (
            <>
              {hiyariNews.length > 0 ? (
                <ul className="space-y-3">
                  {hiyariNews.map((item) => (
                    <li key={item.id} className="rounded-lg border border-[#E6D7C8] bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-[#5C3A2E] sm:text-base">
                          {item.food_name}
                        </div>
                        {item.isNew && (
                          <span className="text-xs font-bold text-[#b76444] sm:text-sm">
                            New !
                          </span>
                        )}
                      </div>
                      {item.accident_content && (
                        <p className="mt-1 text-sm leading-tight text-[#4d443e] sm:text-base">
                          {item.accident_content}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#6d6055] sm:text-base">
                  新しいヒヤリハットはありません。
                </p>
              )}
              <div className="mt-3 flex justify-end">
                <Link
                  href="/News"
                  className="text-sm font-semibold text-[#393430] hover:opacity-70 sm:text-base"
                >
                  すべて見る
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}








