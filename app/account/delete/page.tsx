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
        setStatus(body?.error ?? "Failed to delete the account.");
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
      setStatus("Failed to delete the account. Please wait a moment and try again.");
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F0E4D8] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-[#3A2C25]">Delete account</h1>
          <p className="text-sm text-[#6B5A4E]">
            This action cannot be undone. Deleting your account will also delete all registered children, food restrictions, cooking methods, and incident records.
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm text-[#4D3F36]">
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
            className="mt-1"
          />
          I understand, and I want to delete my account and all related data.
        </label>

        <button
          type="button"
          onClick={handleDelete}
          disabled={!confirmChecked || isDeleting}
          className="w-full rounded-xl bg-red-700 text-white font-semibold py-3 transition hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? "Deleting..." : "Delete account"}
        </button>

        {status && <p className="text-sm text-center text-red-600">{status}</p>}

        <div className="text-center">
          <Link href="/" className="text-[#6B5A4E] font-semibold underline">
            Cancel and return home
          </Link>
        </div>
      </div>
    </main>
  );
}
