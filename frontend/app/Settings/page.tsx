/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/layout/sidebar";
import Topbar from "@/components/ui/layout/topbar";
import {
  Building2,
  FileText,
  ShieldCheck,
  Sparkles,
  Save,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  MapPin,
  Percent,
  Sliders,
  Users,
  UserPlus,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { updateUserPassword, updateUserProfile } from "@/app/actions/auth";
import { getCompanyTeamMembers, updateUserRole, addTeamMember } from "@/app/actions/team";
import { Role } from "@/lib/rbac";
import { syncLiveExchangeRates } from "@/lib/currency";

export default function SettingsPage() {
  const user = useUser();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState<"company" | "invoice" | "stock" | "security" | "team">("company");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State: Company Profile
  const [companyName, setCompanyName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("USD");

  // Form State: Invoice & Tax
  const [salesPrefix, setSalesPrefix] = useState("SO-");
  const [purchasePrefix, setPurchasePrefix] = useState("PO-");
  const [defaultTaxRate, setDefaultTaxRate] = useState("10");
  const [invoiceFooter, setInvoiceFooter] = useState("Thank you for your business!");

  // Form State: Stock & Alerts
  const [minStockThreshold, setMinStockThreshold] = useState("5");
  const [autoDeductStock, setAutoDeductStock] = useState(true);
  const [preventNegativeStock, setPreventNegativeStock] = useState(true);

  // Form State: Security & AI
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [apiKeyStatus] = useState("Connected (Server Gemini 1.5 Flash)");

  // State: Team & Role Management
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string; role: Role; createdAt: string | Date }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<Role>("STAFF");
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamMsg, setTeamMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State: Add New Member
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<Role>("STAFF");
  const [isAddingMember, setIsAddingMember] = useState(false);

  const fetchTeam = async () => {
    setLoadingTeam(true);
    const res = await getCompanyTeamMembers();
    if (res.success && res.members) {
      setTeamMembers(res.members as any);
      if (res.currentUserId) setCurrentUserId(res.currentUserId);
      if (res.currentUserRole) setCurrentUserRole(res.currentUserRole as Role);
    }
    setLoadingTeam(false);
  };

  const normalizedRole = (user?.role || "OWNER").toUpperCase();

  useEffect(() => {
    if (normalizedRole !== "OWNER" && normalizedRole !== "MANAGER") {
      setActiveTab("security");
    }
  }, [normalizedRole]);

  useEffect(() => {
    if (activeTab === "team") {
      fetchTeam();
    }
  }, [activeTab]);

  useEffect(() => {
    syncLiveExchangeRates();

    if (typeof window !== "undefined" && user && (user.email || user.id)) {
      const userKey = `company_settings_${user.id || user.email}`;
      const savedCompanySettings = localStorage.getItem(userKey);

      // Default fields from logged-in user profile
      if (user.email) setBusinessEmail(user.email);
      if (user.companyName || user.name) setCompanyName(user.companyName || user.name);

      if (savedCompanySettings) {
        try {
          const parsed = JSON.parse(savedCompanySettings);
          if (parsed.companyName) setCompanyName(parsed.companyName);
          if (parsed.businessEmail) setBusinessEmail(parsed.businessEmail);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.address) setAddress(parsed.address);
          if (parsed.salesPrefix) setSalesPrefix(parsed.salesPrefix);
          if (parsed.purchasePrefix) setPurchasePrefix(parsed.purchasePrefix);
          if (parsed.defaultTaxRate) setDefaultTaxRate(parsed.defaultTaxRate);
          if (parsed.invoiceFooter) setInvoiceFooter(parsed.invoiceFooter);
          if (parsed.minStockThreshold) setMinStockThreshold(parsed.minStockThreshold);
        } catch {
          // ignore
        }
      }

      const savedCurrency = localStorage.getItem(`currency_${user.id || user.email}`) || localStorage.getItem("currency");
      if (savedCurrency) setCurrency(savedCurrency);
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/Login");
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setPasswordError("");
    setPasswordSuccess("");

    // Update password if fields entered
    if (currentPassword || newPassword || confirmPassword) {
      const passRes = await updateUserPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!passRes.success) {
        setPasswordError(passRes.error || "Gagal memperbarui password.");
        setIsSaving(false);
        return;
      } else {
        setPasswordSuccess(passRes.message || "Password berhasil diperbarui!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    }

    // Update User & Company profile in Prisma DB
    const profileRes = await updateUserProfile({ companyName, businessEmail });
    if (profileRes.success && profileRes.user) {
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(profileRes.user));
        window.dispatchEvent(new Event("user_login"));
      }
    }

    setTimeout(() => {
      // Sync real company settings and currency scoped by User ID / Email
      if (typeof window !== "undefined" && user) {
        const userKey = `company_settings_${user.id || user.email || 'guest'}`;
        const companyData = {
          companyName,
          businessEmail,
          phone,
          address,
          currency,
          salesPrefix,
          purchasePrefix,
          defaultTaxRate,
          invoiceFooter,
          minStockThreshold,
        };
        localStorage.setItem(userKey, JSON.stringify(companyData));
        localStorage.setItem("company_settings", JSON.stringify(companyData));
        localStorage.setItem(`currency_${user.id || user.email}`, currency);
        localStorage.setItem("currency", currency);
        window.dispatchEvent(new Event("currency_change"));
      }

      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    }, 300);
  };

  return (
    <div className={`flex h-screen bg-slate-50 ${isDark ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDark={isDark}
          setIsDark={setIsDark}
          searchPlaceholder="Search settings..."
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  System Settings
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Manage company details, tax rates, inventory thresholds, and security preferences.
                </p>
              </div>

              <Button
                type="submit"
                form="settings-form"
                disabled={isSaving}
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-md shadow-sky-500/20 cursor-pointer transition"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving Changes..." : "Save Settings"}
              </Button>
            </div>

            {/* Notification Alert Banner */}
            {saveSuccess && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Settings saved successfully! Your business parameters have been updated.</span>
              </div>
            )}

            {/* Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
              {(normalizedRole === "OWNER" || normalizedRole === "MANAGER") && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab("company")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
                      activeTab === "company"
                        ? "bg-sky-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    <Building2 className="w-4 h-4" /> Company & Branding
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("invoice")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
                      activeTab === "invoice"
                        ? "bg-sky-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Invoice & Tax
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("stock")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
                      activeTab === "stock"
                        ? "bg-sky-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    <Sliders className="w-4 h-4" /> Inventory Rules
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
                  activeTab === "security"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                <ShieldCheck className="w-4 h-4" /> Security & AI
              </button>

              {(normalizedRole === "OWNER" || normalizedRole === "MANAGER") && (
                <button
                  type="button"
                  onClick={() => setActiveTab("team")}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
                    activeTab === "team"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  <Users className="w-4 h-4" /> Team & Roles
                </button>
              )}
            </div>

            {/* TAB CONTENT */}
            <form id="settings-form" onSubmit={handleSaveSettings}>
              {/* TAB 1: COMPANY & BRANDING */}
              {activeTab === "company" && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 shadow-xs">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Company Profile & Identity
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      This information appears on official Invoices, Purchase Orders, and Reports.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Company Name <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="pl-10 rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Business Email <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          type="email"
                          value={businessEmail}
                          onChange={(e) => setBusinessEmail(e.target.value)}
                          className="pl-10 rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Phone Number
                      </Label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Base Currency Symbol
                      </Label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      >
                        <option value="USD">$ USD - US Dollar</option>
                        <option value="IDR">Rp IDR - Indonesian Rupiah</option>
                        <option value="EUR">€ EUR - Euro</option>
                        <option value="SGD">$ SGD - Singapore Dollar</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Company Office Address
                      </Label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <textarea
                          rows={3}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 pl-10 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: INVOICE & TAX */}
              {activeTab === "invoice" && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 shadow-xs">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Invoice & Purchase Order Parameters
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure numbering formats, tax calculations, and footer disclaimers.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Sales Order Prefix
                      </Label>
                      <Input
                        value={salesPrefix}
                        onChange={(e) => setSalesPrefix(e.target.value)}
                        placeholder="e.g. SO-"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Purchase Order Prefix
                      </Label>
                      <Input
                        value={purchasePrefix}
                        onChange={(e) => setPurchasePrefix(e.target.value)}
                        placeholder="e.g. PO-"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Default Tax Rate (%)
                      </Label>
                      <div className="relative">
                        <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          type="number"
                          value={defaultTaxRate}
                          onChange={(e) => setDefaultTaxRate(e.target.value)}
                          className="pl-10 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Invoice Footer Disclaimer
                      </Label>
                      <textarea
                        rows={3}
                        value={invoiceFooter}
                        onChange={(e) => setInvoiceFooter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: INVENTORY RULES */}
              {activeTab === "stock" && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 shadow-xs">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Inventory Control & Alert Rules
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Manage low stock threshold warnings and stock movement behaviors.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-1.5 max-w-sm">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Default Low Stock Warning Threshold (pcs)
                      </Label>
                      <Input
                        type="number"
                        value={minStockThreshold}
                        onChange={(e) => setMinStockThreshold(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoDeductStock}
                          onChange={(e) => setAutoDeductStock(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Automatic Stock Deduction on Sales</p>
                          <p className="text-[11px] text-slate-500">Automatically reduce inventory stock count when a sales order is completed.</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preventNegativeStock}
                          onChange={(e) => setPreventNegativeStock(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Prevent Negative Stock Sales</p>
                          <p className="text-[11px] text-slate-500">Block creation of sales orders when product inventory stock is zero.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SECURITY & AI */}
              {activeTab === "security" && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 shadow-xs">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Security & Gemini AI Status
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Update account password and check Gemini AI integration parameters.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-sky-600" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Gemini AI Assistant Service</p>
                          <p className="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5">{apiKeyStatus}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                        Active
                      </span>
                    </div>

                    <div className="space-y-4 max-w-md pt-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Change Password</h4>

                      {passwordError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300">
                          {passwordError}
                        </div>
                      )}

                      {passwordSuccess && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{passwordSuccess}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Current Password</Label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="pl-10 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Password</Label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="pl-10 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</Label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="pl-10 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: TEAM & ROLES */}
              {activeTab === "team" && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Team Members & Access Controls
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage user roles and grant permissions for your enterprise organization.
                      </p>
                    </div>

                    {(currentUserRole === "OWNER" || currentUserRole === "MANAGER") && (
                      <Button
                        type="button"
                        onClick={() => setIsAddingMember(true)}
                        className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition"
                      >
                        <UserPlus className="w-4 h-4" /> Add Team Member
                      </Button>
                    )}
                  </div>

                  {teamMsg && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-semibold border flex items-center justify-between ${
                        teamMsg.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800"
                          : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800"
                      }`}
                    >
                      <span>{teamMsg.text}</span>
                      <button type="button" onClick={() => setTeamMsg(null)} className="text-slate-400 hover:text-slate-600">×</button>
                    </div>
                  )}

                  {/* Table Team Members */}
                  {loadingTeam ? (
                    <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-600" /> Loading team members...
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                            <th className="py-3 px-4">Member Name</th>
                            <th className="py-3 px-4">Work Email</th>
                            <th className="py-3 px-4">Role Access</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                          {teamMembers.map((member) => (
                            <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                              <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 flex items-center justify-center text-xs font-black">
                                  {member.name.charAt(0).toUpperCase()}
                                </div>
                                {member.name}
                                {member.id === currentUserId && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">You</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{member.email}</td>
                              <td className="py-3.5 px-4">
                                {(currentUserRole === "OWNER" || currentUserRole === "MANAGER") ? (
                                  <select
                                    value={member.role}
                                    onChange={async (e) => {
                                      const newRole = e.target.value as Role;
                                      const res = await updateUserRole(member.id, newRole);
                                      if (res.success) {
                                        setTeamMsg({ type: "success", text: res.message || "Role updated successfully!" });
                                        if (member.id === currentUserId && typeof window !== "undefined") {
                                          const stored = localStorage.getItem("user");
                                          if (stored) {
                                            const parsed = JSON.parse(stored);
                                            parsed.role = newRole;
                                            localStorage.setItem("user", JSON.stringify(parsed));
                                            window.dispatchEvent(new Event("user_login"));
                                          }
                                        }
                                        fetchTeam();
                                      } else {
                                        setTeamMsg({ type: "error", text: res.error || "Failed to update role." });
                                      }
                                    }}
                                    className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                  >
                                    <option value="OWNER">OWNER (Full Access)</option>
                                    <option value="MANAGER">MANAGER (Ops & Reports)</option>
                                    <option value="WAREHOUSE">WAREHOUSE (Stock & Inventory)</option>
                                    <option value="SALES">SALES (CRM & Invoicing)</option>
                                    <option value="FINANCE">FINANCE (Payments & Tax)</option>
                                    <option value="STAFF">STAFF (Basic View)</option>
                                  </select>
                                ) : (
                                  <span className="font-bold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {member.role}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <span className="text-[11px] text-slate-400">
                                  Joined {new Date(member.createdAt).toLocaleDateString()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Modal Add Member */}
                  {isAddingMember && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-sky-600" /> Add New Team Member
                          </h4>
                          <button type="button" onClick={() => setIsAddingMember(false)} className="text-slate-400 hover:text-slate-600 text-base">✕</button>
                        </div>

                        <div className="space-y-3 text-xs">
                          <div className="space-y-1">
                            <Label className="font-semibold text-slate-700 dark:text-slate-300">Full Name</Label>
                            <Input
                              value={newMemberName}
                              onChange={(e) => setNewMemberName(e.target.value)}
                              placeholder="e.g. Budi Santoso"
                              className="rounded-xl"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="font-semibold text-slate-700 dark:text-slate-300">Work Email</Label>
                            <Input
                              type="email"
                              value={newMemberEmail}
                              onChange={(e) => setNewMemberEmail(e.target.value)}
                              placeholder="budi@company.com"
                              className="rounded-xl"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="font-semibold text-slate-700 dark:text-slate-300">Password Akun (Kosongkan jika default: FlowERP123!)</Label>
                            <Input
                              type="text"
                              value={newMemberPassword}
                              onChange={(e) => setNewMemberPassword(e.target.value)}
                              placeholder="Ketik password atau biarkan default"
                              className="rounded-xl"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="font-semibold text-slate-700 dark:text-slate-300">Assign Role</Label>
                            <select
                              value={newMemberRole}
                              onChange={(e) => setNewMemberRole(e.target.value as Role)}
                              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                            >
                              <option value="STAFF">STAFF (Basic View)</option>
                              <option value="WAREHOUSE">WAREHOUSE (Stock & Inventory)</option>
                              <option value="SALES">SALES (CRM & Invoicing)</option>
                              <option value="FINANCE">FINANCE (Payments & Tax)</option>
                              <option value="MANAGER">MANAGER (Ops & Reports)</option>
                              <option value="OWNER">OWNER (Full Enterprise Control)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAddingMember(false)}
                            className="rounded-xl text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={async () => {
                              if (!newMemberName || !newMemberEmail) {
                                alert("Mohon lengkapi nama dan email.");
                                return;
                              }
                              const res = await addTeamMember({
                                name: newMemberName,
                                email: newMemberEmail,
                                password: newMemberPassword || undefined,
                                role: newMemberRole,
                              });
                              if (res.success) {
                                setIsAddingMember(false);
                                setNewMemberName("");
                                setNewMemberEmail("");
                                setNewMemberPassword("");
                                setTeamMsg({ type: "success", text: res.message || "Anggota berhasil ditambahkan." });
                                fetchTeam();
                              } else {
                                alert(res.error || "Gagal menambah anggota.");
                              }
                            }}
                            className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold"
                          >
                            Create Account
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
