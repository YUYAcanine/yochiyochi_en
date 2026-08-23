"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toAuthEmail } from "@/lib/memberAuth";
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from "@/lib/passwordPolicy";

export default function LoginPage() {
  const [memberId, setMemberId] = useState("");
  const [passward, setPassward] = useState("");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regMemberId, setRegMemberId] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"login" | "register" | null>(null);
  const router = useRouter();

  const getFriendlyErrorMessage = (action: "login" | "register", err: unknown) => {
    const base = action === "login" ? "Login" : "Registration";
    if (err && typeof err === "object") {
      const maybe = err as Partial<{
        message: string;
        details: string;
        hint: string;
        code: string;
      }>;
      const parts = [maybe.message, maybe.details, maybe.hint, maybe.code].filter(
        (value) => typeof value === "string" && value.trim().length > 0
      );
      if (parts.length > 0) {
        return `${base} failed: ${parts.join(" / ")}`;
      }
    }
    if (err instanceof Error && err.message) {
      return `${base} failed: ${err.message}`;
    }
    return `${base} failed. Please wait a moment and try again.`;
  };

  const handleLogin = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!memberId.trim() || !passward.trim()) {
      setStatus("Please enter your Member ID and password.");
      setStatusIsError(true);
      return;
    }

    setIsLoading(true);
    setLoadingAction("login");
    setStatus("Checking your login information…");
    setStatusIsError(false);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: toAuthEmail(memberId),
        password: passward,
      });

      if (signInError || !data.session) {
        setStatus("Member ID or password is incorrect.");
        setStatusIsError(true);
        if (typeof window !== "undefined") {
          localStorage.removeItem("yochiLoggedIn");
          localStorage.removeItem("yochiMemberId");
          window.dispatchEvent(new Event("yochi-auth-changed"));
        }
        return;
      }

      setStatus("Logged in.");
      setStatusIsError(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("yochiLoggedIn", "true");
        localStorage.setItem("yochiMemberId", memberId);
        window.dispatchEvent(new Event("yochi-auth-changed"));
      }
      router.push("/");
    } catch (err) {
      console.error("handleLogin error:", err);
      setStatus(getFriendlyErrorMessage("login", err));
      setStatusIsError(true);
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleToggleRegister = (open: boolean) => {
    setIsRegisterOpen(open);
    setRegMemberId("");
    setRegPassword("");
    setRegPasswordConfirm("");
    setStatus(null);
    setStatusIsError(false);
  };

  const handleRegisterSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();

    if (!regMemberId.trim() || !regPassword.trim() || !regPasswordConfirm.trim()) {
      setStatus("Please enter a Member ID, password, and password confirmation.");
      setStatusIsError(true);
      return;
    }

    if (!isPasswordValid(regPassword)) {
      setStatus(PASSWORD_POLICY_MESSAGE);
      setStatusIsError(true);
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      setStatus("Passwords do not match. Please try again.");
      setStatusIsError(true);
      return;
    }

    setIsLoading(true);
    setLoadingAction("register");
    setStatus("Processing your registration…");
    setStatusIsError(false);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: regMemberId, password: regPassword }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(body?.error ?? "Registration failed.");
        setStatusIsError(true);
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: toAuthEmail(regMemberId),
        password: regPassword,
      });

      if (signInError || !signInData.session) {
        setStatus("Registration complete, but automatic login failed. Please log in again.");
        setStatusIsError(true);
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("yochiLoggedIn", "true");
        localStorage.setItem("yochiMemberId", regMemberId);
        window.dispatchEvent(new Event("yochi-auth-changed"));
      }
      router.push("/");
    } catch (err) {
      console.error("handleRegisterSubmit error:", err);
      setStatus(getFriendlyErrorMessage("register", err));
      setStatusIsError(true);
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#F0E4D8] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {!isRegisterOpen ? (
          <>
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-[#3A2C25]">Member Login</h1>
              <p className="text-sm text-[#6B5A4E]">Please enter your registered Member ID and password</p>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <label className="block text-sm font-semibold text-[#4D3F36]">
                Member ID
                <input
                  type="text"
                  name="memberId"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#D3C5B9] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="e.g. A123456"
                  required
                />
              </label>

              <label className="block text-sm font-semibold text-[#4D3F36]">
                Password
                <input
                  type="password"
                  name="passward"
                  value={passward}
                  onChange={(e) => setPassward(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#D3C5B9] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Password"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-brand text-white font-semibold py-3 transition hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading && loadingAction === "login" ? "Checking..." : "Log in"}
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => handleToggleRegister(true)}
                className="text-[#6B5A4E] font-semibold underline"
              >
                Go to sign up
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-[#3A2C25]">Sign Up</h1>
              <p className="text-sm text-[#6B5A4E]">Please enter a Member ID and password</p>
            </div>

            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              <label className="block text-sm font-semibold text-[#4D3F36]">
                Member ID
                <input
                  type="text"
                  name="regMemberId"
                  value={regMemberId}
                  onChange={(e) => setRegMemberId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#D3C5B9] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="e.g. A123456"
                  required
                />
              </label>

              <label className="block text-sm font-semibold text-[#4D3F36]">
                Password
                <input
                  type="password"
                  name="regPassword"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#D3C5B9] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="8+ characters, 2+ character types"
                  required
                />
                <span className="mt-1 block text-xs font-normal text-[#8A7B6E]">
                  Use at least 8 characters, combining 2 or more of: uppercase letters, lowercase letters, numbers, and symbols.
                </span>
              </label>

              <label className="block text-sm font-semibold text-[#4D3F36]">
                Confirm Password
                <input
                  type="password"
                  name="regPasswordConfirm"
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#D3C5B9] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Re-enter the same password"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-brand text-white font-semibold py-3 transition hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading && loadingAction === "register" ? "Signing up..." : "Sign up"}
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => handleToggleRegister(false)}
                className="text-[#6B5A4E] font-semibold underline"
              >
                Go to login
              </button>
            </div>
          </>
        )}

        {status && (
          <p className={`text-sm text-center ${statusIsError ? "text-red-600 font-semibold" : "text-[#6B5A4E]"}`}>
            {status}
          </p>
        )}

        <div className="text-center">
          <Link href="/" className="text-[#6B5A4E] font-semibold underline">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
