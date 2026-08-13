"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import {
  ChevronDown,
  CheckCircle2,
  Zap,
  Box,
  UserPlus,
  CreditCard,
  BarChart3,
  Calendar,
  Cpu,
  Activity,
  ArrowRight,
  // Sparkles,
  TrendingUp,
  Layers,
  Star,
  Check,
  Bot,
  Building2,
  Users,
} from "lucide-react";

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "Modules", href: "#modules" },
  { name: "AI Insights", href: "#ai-insights" },
  { name: "Pricing", href: "#pricing" },
  { name: "FAQ", href: "#faq" },
];

const featureList = [
  {
    icon: <Box className="w-6 h-6 text-sky-600" />,
    title: "Inventory & Warehouse",
    desc: "Real-time stock tracking, automated low-stock alerts, SKU management, and movement logs.",
  },
  {
    icon: <Activity className="w-6 h-6 text-sky-600" />,
    title: "Sales & Order Workflows",
    desc: "Streamlined sales quotes, order fulfillments, automated payment status tracking, and invoicing.",
  },
  {
    icon: <UserPlus className="w-6 h-6 text-sky-600" />,
    title: "Customer CRM",
    desc: "Centralized client directory, purchase history, order volume metrics, and customer health tracking.",
  },
  {
    icon: <Calendar className="w-6 h-6 text-sky-600" />,
    title: "Purchasing & Suppliers",
    desc: "Supplier directory management, purchase order generation, lead times, and cost breakdown.",
  },
  {
    icon: <CreditCard className="w-6 h-6 text-sky-600" />,
    title: "Financial Analytics & Reports",
    desc: "Real-time computed revenue, monthly growth trends, inventory valuation, and payment breakdowns.",
  },
  {
    icon: <Cpu className="w-6 h-6 text-sky-600" />,
    title: "Gemini AI Business Assistant",
    desc: "Actionable predictive insights, demand forecasting, and natural language ERP analysis.",
  },
];

const moduleList = [
  { name: "Products", desc: "Manage catalog, SKUs, and pricing", icon: <Box className="w-5 h-5 text-sky-600" /> },
  { name: "Inventory", desc: "Stock levels and movements", icon: <Layers className="w-5 h-5 text-sky-600" /> },
  { name: "Sales Orders", desc: "Order creation and invoices", icon: <TrendingUp className="w-5 h-5 text-sky-600" /> },
  { name: "Purchases", desc: "Procurement and PO creation", icon: <CreditCard className="w-5 h-5 text-sky-600" /> },
  { name: "Suppliers", desc: "Vendor details and contact log", icon: <Building2 className="w-5 h-5 text-sky-600" /> },
  { name: "Customers", desc: "Client CRM & activity logs", icon: <Users className="w-5 h-5 text-sky-600" /> },
  { name: "Reports", desc: "Computed financial charts & trends", icon: <BarChart3 className="w-5 h-5 text-sky-600" /> },
  { name: "AI Assistant", desc: "Ask Gemini AI about your business", icon: <Bot className="w-5 h-5 text-sky-600" /> },
];

const aiCards = [
  {
    title: "Predictive Demand Forecast",
    desc: "Anticipate stock demand by analyzing sales velocity to prevent stockouts and overstocking.",
    icon: <Zap className="w-6 h-6 text-sky-400" />,
  },
  {
    title: "Revenue & Sales Analytics",
    desc: "Identify revenue growth opportunities, top-performing SKUs, and monthly performance trends.",
    icon: <BarChart3 className="w-6 h-6 text-sky-400" />,
  },
  {
    title: "Intelligent Business Health",
    desc: "Compute real-time health scores across sales, inventory, purchasing, and finance modules.",
    icon: <Activity className="w-6 h-6 text-sky-400" />,
  },
];

const pricing = [
  {
    name: "Starter",
    price: "$29",
    annualPrice: "$23",
    desc: "Essential tools for growing small businesses.",
    bullets: [
      "Multi-Tenant Isolated Workspace",
      "Up to 5 User Accounts",
      "Products, Inventory & Sales Modules",
      "Basic Financial Reporting",
      "Standard Email Support",
    ],
    featured: false,
    cta: "Start Free Trial",
  },
  {
    name: "Professional",
    price: "$99",
    annualPrice: "$79",
    desc: "Complete ERP suite with Gemini AI intelligence.",
    bullets: [
      "Everything in Starter",
      "Unlimited User Accounts",
      "Full Purchases, Suppliers & CRM",
      "Real-time Reports & Charts",
      "Gemini AI Business Insights & Chat",
      "Priority Support 24/7",
    ],
    featured: true,
    cta: "Get Started Now",
  },
  {
    name: "Enterprise",
    price: "$249",
    annualPrice: "$199",
    desc: "Dedicated ERP performance for large organizations.",
    bullets: [
      "Everything in Professional",
      "Dedicated High-Speed Database",
      "Custom Module Workflows",
      "99.9% Uptime Guarantee (SLA)",
      "Dedicated Account Manager",
      "Onboarding & Team Training",
    ],
    featured: false,
    cta: "Contact Enterprise Sales",
  },
];

const testimonials = [
  {
    quote: "FlowERP AI has completely transformed our inventory management. Having real-time stock alerts and AI demand forecasting saved us over $25,000 in missed sales within 3 months.",
    name: "Alexander Wright",
    role: "COO, Apex Retail Operations",
    initials: "AW",
  },
  {
    quote: "The multi-tenant data isolation and instant Next.js performance are incredible. Connecting sales orders directly to suppliers made procurement 10x faster.",
    name: "Sophia Chen",
    role: "Founder, Zenith Tech Global",
    initials: "SC",
  },
  {
    quote: "Asking Gemini AI about our monthly revenue trends and getting instant data-driven answers feels like having a senior business analyst working 24/7.",
    name: "Marcus Vance",
    role: "Head of Operations, Vanguard Logistics",
    initials: "MV",
  },
];

const faqs = [
  {
    q: "Can I try FlowERP AI for free?",
    a: "Yes! You can register a new account instantly and start exploring the full platform with complete data isolation for 14 days with zero risk.",
  },
  {
    q: "Is my business data isolated from other users?",
    a: "Absolutely. FlowERP AI uses strict multi-tenancy architecture. Each registered company receives an isolated workspace and company ID in the database.",
  },
  {
    q: "How does the Gemini AI Business Insights assistant work?",
    a: "Gemini AI securely inspects your live dashboard metrics (revenue, orders, low stock items, and top products) to answer questions and generate predictive business recommendations.",
  },
  {
    q: "Can I manage multiple suppliers and purchase orders?",
    a: "Yes. The Purchases and Suppliers modules allow you to add real suppliers, select real products, compute order totals, and update stock automatically.",
  },
  {
    q: "Is FlowERP AI mobile-responsive?",
    a: "Yes. The entire user interface is built with responsive CSS and Tailwind, ensuring a seamless experience across desktop, tablet, and mobile devices.",
  },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-sky-500/20">
        F
      </div>
      <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        FlowERP <span className="text-sky-600">AI</span>
      </div>
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="w-full relative">
      <div className="absolute -inset-1 rounded-2xl bg-linear-to-r from-sky-500 to-indigo-600 opacity-25 blur-xl group-hover:opacity-40 transition duration-1000"></div>
      
      <div className="relative rounded-2xl border border-slate-200/80 bg-white/95 p-4 sm:p-6 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
        {/* Window controls header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            <span className="ml-2 text-xs font-semibold text-slate-400">FlowERP AI — Real-time Executive Workspace</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Engine Active
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">$124,500</p>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3 h-3" /> +14% this month
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Sales Orders</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">2,340</p>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3 h-3" /> +8% vs last week
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Active SKUs</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">185 Products</p>
            <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 mt-1 block">
              100% In Sync
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/60">
            <p className="text-[11px] font-medium text-sky-800 dark:text-sky-300">AI Business Health</p>
            <p className="text-lg font-bold text-sky-600 dark:text-sky-400 mt-0.5">94%</p>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 block">
              Optimal Condition
            </span>
          </div>
        </div>

        {/* Visual Chart Simulation */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Monthly Revenue & Sales Growth</span>
            <span className="text-[11px] text-slate-400">2026 Analytics</span>
          </div>
          <div className="h-28 flex items-end justify-between gap-2 px-2 pt-2">
            {[45, 60, 52, 78, 65, 90, 84, 98].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-md bg-linear-to-t from-sky-600 to-indigo-500 opacity-90 hover:opacity-100 transition-all duration-300"
                  style={{ height: `${h}%` }}
                ></div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Stream */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Recent Sales Order #SO-1048 Completed
          </span>
          <span className="text-[11px] font-semibold text-sky-600">+$1,450.00</span>
        </div>
      </div>
    </div>
  );
}

function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all dark:border-slate-800 dark:bg-slate-800/60"
        >
          <button
            onClick={() => setOpen(open === idx ? null : idx)}
            className="flex w-full items-center justify-between text-left font-semibold text-slate-900 dark:text-white"
          >
            <span>{it.q}</span>
            <ChevronDown
              className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${
                open === idx ? "rotate-180 text-sky-600" : ""
              }`}
            />
          </button>
          {open === idx && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {it.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/Login");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <Logo />

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            {navLinks.map((l) => (
              <a
                key={l.name}
                href={l.href}
                className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
              >
                {l.name}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogin}
              className="text-sm font-medium px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push("/Register")}
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-24">
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-4">
          <div className="space-y-6">

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.15]">
              Empower Your Business with{" "}
              <span className="bg-linear-to-r from-sky-600 to-sky-500 bg-clip-text text-transparent">
                AI-Driven ERP
              </span>
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
              Unified cloud platform to manage inventory, sales orders, customer CRM, purchasing workflows, financial analytics, and intelligent predictive insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => router.push("/Register")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-6 py-3.5 font-semibold shadow-lg shadow-sky-500/25 transition cursor-pointer"
              >
                Start Free 14-Day Trial <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push("/Login")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 px-6 py-3.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Sign In to Portal
              </button>
            </div>

            {/* Feature Checkmarks */}
            {/* <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 100% Data Isolation
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-500" /> Real-time DB Synchronization
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> Instant HMR Setup
              </span>
            </div> */}
          </div>

          <div className="w-full">
            <HeroMockup />
          </div>
        </section>

        {/* Stats Counter Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-center space-y-1">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">99.9%</div>
            <div className="text-xs text-slate-500 font-medium">Uptime Guarantee SLA</div>
          </div>
          <div className="text-center space-y-1 border-l border-slate-100 dark:border-slate-800">
            <div className="text-3xl font-extrabold text-sky-600 dark:text-sky-400">&lt;100ms</div>
            <div className="text-xs text-slate-500 font-medium">Database Response Time</div>
          </div>
          <div className="text-center space-y-1 border-l border-slate-100 dark:border-slate-800">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">100%</div>
            <div className="text-xs text-slate-500 font-medium">Multi-Tenant Account Isolation</div>
          </div>
          <div className="text-center space-y-1 border-l border-slate-100 dark:border-slate-800">
            <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">24/7</div>
            <div className="text-xs text-slate-500 font-medium">Gemini AI Assistance</div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything You Need to Scale Your Operations
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              FlowERP AI integrates inventory management, order processing, CRM, purchasing, and reporting into one frictionless workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureList.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-sky-500/40 hover:shadow-lg transition-all duration-300"
              >
                <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/60 inline-block border border-sky-100 dark:border-sky-800/60 group-hover:scale-105 transition-transform duration-300">
                  {f.icon}
                </div>
                <h3 className="mt-4 font-semibold text-lg text-slate-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Modules Section */}
        <section id="modules" className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">
              Integrated Enterprise Modules
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Modular architecture allows your team to navigate seamlessly across every business function.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {moduleList.map((m) => (
              <div
                key={m.name}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-sky-500/30 transition duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60">
                    {m.icon}
                  </div>
                  <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                    Active Module
                  </span>
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                  {m.name}
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* AI Engine Spotlight */}
        <section id="ai-insights" className="rounded-3xl p-8 sm:p-12 bg-linear-to-tr from-slate-900 via-slate-900 to-indigo-950 text-white shadow-2xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-xs font-semibold text-sky-400">
              <Bot className="w-4 h-4" /> Gemini AI Engine
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              AI That Helps You Make Better Business Decisions
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Stop guessing sales trends or manual inventory counts. FlowERP AI evaluates real-time transaction velocity to generate instant actionable insights.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {aiCards.map((a) => (
              <div
                key={a.title}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition duration-300"
              >
                <div className="p-3 rounded-xl bg-sky-500/20 inline-block mb-3">
                  {a.icon}
                </div>
                <h3 className="font-semibold text-lg text-white">{a.title}</h3>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  {a.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Choose the plan that fits your business scale. No hidden fees or setup charges.
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <span className={`text-xs font-semibold ${!isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Monthly</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="w-12 h-6 rounded-full bg-slate-200 dark:bg-slate-800 p-1 transition-colors relative"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-sky-600 transition-transform ${
                    isAnnual ? 'translate-x-6' : 'translate-x-0'
                  }`}
                ></div>
              </button>
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                Annual <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={`relative p-8 rounded-3xl border flex flex-col justify-between transition duration-300 ${
                  p.featured
                    ? "bg-white dark:bg-slate-900 border-sky-500 shadow-xl ring-2 ring-sky-500/20"
                    : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs"
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-sky-600 text-white text-xs font-bold shadow-md">
                    Most Popular
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {p.desc}
                  </p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                      {isAnnual ? p.annualPrice : p.price}
                    </span>
                    <span className="text-xs text-slate-500">/ month</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <button
                    onClick={() => router.push("/Register")}
                    className={`w-full py-3 rounded-xl font-semibold text-xs transition cursor-pointer ${
                      p.featured
                        ? "bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-500/20"
                        : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-900 dark:text-white"
                    }`}
                  >
                    {p.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">
              Trusted by Growing Businesses
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              See how operations teams optimize inventory and drive profitability with FlowERP AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-400 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    &quot;{t.quote}&quot;
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Have questions? We&apos;ve got answers.
            </p>
          </div>

          <Accordion items={faqs} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-4 sm:col-span-2 md:col-span-1">
            <Logo />
            <p className="text-xs text-slate-500 leading-relaxed">
              FlowERP AI — Next-generation intelligent ERP platform for modern business management.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              All Systems Operational
            </div>
          </div>

          <div>
            <div className="font-semibold text-xs tracking-wider uppercase text-slate-900 dark:text-white">
              Platform
            </div>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
              <li><a href="#features" className="hover:text-sky-600 transition">Inventory & Warehouse</a></li>
              <li><a href="#features" className="hover:text-sky-600 transition">Sales Orders & Invoicing</a></li>
              <li><a href="#features" className="hover:text-sky-600 transition">Purchases & Suppliers</a></li>
              <li><a href="#ai-insights" className="hover:text-sky-600 transition">Gemini AI Assistant</a></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-xs tracking-wider uppercase text-slate-900 dark:text-white">
              Resources
            </div>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
              <li><span className="hover:text-sky-600 cursor-pointer">Documentation</span></li>
              <li><span className="hover:text-sky-600 cursor-pointer">API Integration Guide</span></li>
              <li><span className="hover:text-sky-600 cursor-pointer">Community Forum</span></li>
              <li><span className="hover:text-sky-600 cursor-pointer">Security Overview</span></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-xs tracking-wider uppercase text-slate-900 dark:text-white">
              Company
            </div>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
              <li><span className="hover:text-sky-600 cursor-pointer">About FlowERP</span></li>
              <li><span className="hover:text-sky-600 cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-sky-600 cursor-pointer">Terms of Service</span></li>
              <li><span className="hover:text-sky-600 cursor-pointer">Contact Support</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 py-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} FlowERP AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}