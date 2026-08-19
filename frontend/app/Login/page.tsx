"use client";

import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { loginUser } from "@/app/actions/auth";
import { setAuthCookie } from "@/app/actions/auth-cookie";

const featureItems = [
  { label: "Real-time Inventory & Stock Movements", icon: Box },
  { label: "Sales Orders & Automated Invoicing", icon: Zap },
  { label: "Customer CRM & Transaction Logs", icon: Users },
  { label: "Supplier Procurement & Purchase Orders", icon: ShieldCheck },
  { label: "Gemini AI Predictive Analytics", icon: TrendingUp },
];

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

function FeatureList() {
  return (
    <div className="space-y-3">
      {featureItems.map((feature) => {
        const Icon = feature.icon;
        return (
          <div
            key={feature.label}
            className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{feature.label}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const getRedirectPathByRole = (role?: string): string => {
    const normalizedRole = (role || 'OWNER').toUpperCase();
    switch (normalizedRole) {
      case 'WAREHOUSE':
      case 'STAFF':
        return '/Products';
      case 'SALES':
        return '/Sales';
      case 'FINANCE':
        return '/ReportsPage';
      case 'OWNER':
      case 'MANAGER':
      default:
        return '/Dashboard';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const serverRes = await loginUser({ email, password });
      if (serverRes.success && serverRes.user) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("flowerp_products_cache");
          localStorage.removeItem("flowerp_active_shift");
          localStorage.removeItem("flowerp_held_orders");
          localStorage.removeItem("flowerp_offline_queue");
          localStorage.removeItem("flowerp_transfers_intransit");
        }
        localStorage.setItem("user", JSON.stringify(serverRes.user));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("user_login"));
        }
        await setAuthCookie("session-token", "refresh-token", serverRes.user.id, serverRes.user.role);
        const targetPath = getRedirectPathByRole(serverRes.user.role);
        window.location.href = targetPath;
        return;
      } else if (serverRes.error) {
        setErrorMsg(serverRes.error);
        setIsLoading(false);
        return;
      }
    } catch {
      // Fallback to REST API
    }

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
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
        const targetPath = getRedirectPathByRole(res.data.user.role);
        router.push(targetPath);
        return;
      } else {
        setErrorMsg(res?.message || "Login failed. Please check your credentials.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during login.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Brand & Feature Highlights */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-4">
          <div className="space-y-6">
            <Logo />

            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Streamline operations with real-time intelligence.
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect inventory, sales orders, suppliers, customer records, and Gemini AI analysis in one unified platform.
              </p>
            </div>

            <FeatureList />
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Strict Multi-Tenant Account Isolation</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Active SLA
            </span>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="space-y-2">
              <div className="lg:hidden mb-4">
                <Logo />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sign In to Your Workspace
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your credentials to access your business portal.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs font-medium text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
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
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
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

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={() => setRemember(!remember)}
                    className="h-4 w-4 rounded border-slate-300 bg-white text-sky-600 accent-sky-600 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                  Remember me
                </label>
                <span className="text-slate-400 hover:text-sky-600 transition cursor-pointer">
                  Forgot password?
                </span>
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
                    Sign In to Portal <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/Register"
                className="font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 transition"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
