"use client";

import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState} from "react";
import Link from "next/link";
import {
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { registerUser } from "@/app/actions/auth";
import { setAuthCookie } from "@/app/actions/auth-cookie";

function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 text-slate-900 dark:text-white group">
      <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
        F
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          FlowERP <span className="text-sky-600">AI</span>
        </span>
        <span className="text-[10px] text-slate-500 font-medium -mt-1">Enterprise Intelligence Suite</span>
      </div>
    </Link>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const serverRes = await registerUser({ name, companyName, email, password });
      if (serverRes.success && serverRes.user) {
        localStorage.setItem("user", JSON.stringify(serverRes.user));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("user_login"));
        }
        await setAuthCookie("session-token", "refresh-token", serverRes.user.id, serverRes.user.role);
        router.push("/Dashboard");
        return;
      } else if (serverRes.error) {
        setErrorMsg(serverRes.error);
        setIsLoading(false);
        return;
      }
    } catch {
      // Fallback
    }

    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, companyName, email, password }),
      });
      if (res.success && res.data?.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("user_login"));
        }
        await setAuthCookie(
          res.data.tokens?.accessToken || "",
          res.data.tokens?.refreshToken || "",
          res.data.user.id,
          res.data.user.role
        );
        router.push("/Dashboard");
        return;
      } else {
        setErrorMsg(res?.message || "Registration failed. Please check your details.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during registration.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Onboarding Value proposition */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-4">
          <div className="space-y-6">
            <Logo />

            <div className="space-y-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded border border-sky-200/60 dark:border-sky-800/60">
                14-Day Free Access
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Start managing your business in minutes.
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Create your business workspace to manage inventory, automate order fulfillment, track purchases, and chat with Gemini AI.
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Clean 0-Data Start</p>
                  <p className="text-[11px] text-slate-500">Your account begins completely clean with 100% isolated multi-tenant database records.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">No Credit Card Required</p>
                  <p className="text-[11px] text-slate-500">Get full access to all features immediately with zero setup charges.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Instant AI Integration</p>
                  <p className="text-[11px] text-slate-500">Ask Gemini AI about sales trends, low stock alerts, and financial insights.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Enterprise Database Encryption</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Active Security
            </span>
          </div>
        </div>

        {/* Right Side: Registration Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="space-y-2">
              <div className="lg:hidden mb-4">
                <Logo />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Create Your Account
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your details to register a new business account.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs font-medium text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Arkan Farrel"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="company" className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Company / Store Name
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="company"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="FlowERP Store"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white py-3 text-xs font-semibold shadow-md shadow-sky-500/20 transition cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create Workspace <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
              Already have an account?{" "}
              <Link
                href="/Login"
                className="font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 transition"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
