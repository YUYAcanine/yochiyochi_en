"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/apiFetch";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirmChecked || isDeleting) return;
    setIsDeleting(true);
    setStatus(null);

    try {
      const res = await authedFetch("/api/auth/delete-account", { method: "DELETE" });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(body?.error ?? "アカウントの削除に失敗しました。");
        setIsDeleting(false);
        return;
      }

      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        localStorage.setItem("yochiLoggedIn", "false");
        localStorage.removeItem("yochiMemberId");
        window.dispatchEvent(new Event("yochi-auth-changed"));
      }
      router.replace("/");
    } catch (err) {
      console.error("delete account error:", err);
      setStatus("アカウントの削除に失敗しました。時間をおいて再度お試しください。");
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F0E4D8] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-[#3A2C25]">アカウント削除</h1>
          <p className="text-sm text-[#6B5A4E]">
            この操作は取り消せません。アカウントを削除すると、登録済みの園児情報・食材制限・調理方法・ヒヤリハット記録もすべて削除されます。
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm text-[#4D3F36]">
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
            className="mt-1"
          />
          内容を理解した上で、アカウントとすべての関連データを削除します。
        </label>

        <button
          type="button"
          onClick={handleDelete}
          disabled={!confirmChecked || isDeleting}
          className="w-full rounded-xl bg-red-700 text-white font-semibold py-3 transition hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? "削除しています..." : "アカウントを削除する"}
        </button>

        {status && <p className="text-sm text-center text-red-600">{status}</p>}

        <div className="text-center">
          <Link href="/" className="text-[#6B5A4E] font-semibold underline">
            キャンセルしてホームに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
