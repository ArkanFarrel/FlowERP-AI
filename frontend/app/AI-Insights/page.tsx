"use client"
import Sidebar from "@/components/ui/layout/sidebar";
import Topbar from "@/components/ui/layout/topbar";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Clock,
  TrendingUp,
  PackageSearch,
  Sparkles,
  BarChart3,
  DollarSign,
  Activity,
  Bot,
  AlertTriangle,
  CircleCheck,
  ShoppingCart,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2 } from "lucide-react";

interface ReplenishmentItem {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  costPrice: number;
  salesVelocity30Days: number;
  dailyVelocity: number;
  estimatedDaysRemaining: number;
  suggestedRestockQuantity: number;
  supplierId?: string;
  supplierName: string;
  urgency: "Critical" | "High" | "Dead Stock" | "Optimal";
  recommendationText: string;
}

export default function InsightPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [promptInput, setPromptInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // AI Replenishment Advisor States
  const [generatingPoId, setGeneratingPoId] = useState<string | null>(null);
  const [advisorFilter, setAdvisorFilter] = useState<"all" | "reorder" | "deadstock">("all");
  const [replenishmentItems, setReplenishmentItems] = useState<ReplenishmentItem[]>([]);

  // Order Confirmation Modal (qty editor + price preview before generating PO)
  const [orderConfirmModal, setOrderConfirmModal] = useState<{
    isOpen: boolean;
    item: ReplenishmentItem;
    orderQty: number;
    targetStatus: "Delivered" | "Ordered";
  } | null>(null);

  const [poSuccessModal, setPoSuccessModal] = useState<{
    isOpen: boolean;
    poNumber: string;
    productName: string;
    sku: string;
    supplierName: string;
    quantity: number;
    unitCost: number;
    totalAmount: number;
    message: string;
    createdAt: string;
  } | null>(null);

  const [insightsData, setInsightsData] = useState<{
    businessScore: number;
    healthChange: string;
    revenueForecast: number;
    forecastChange: string;
    inventoryRiskCount: number;
    aiRecommendationsCount: number;
    insights: string[];
  } | null>(null);

  const [predictionsData, setPredictionsData] = useState<Array<{
    productId: string;
    productName: string;
    sku: string;
    currentStock: number;
    minimumStock: number;
    estimatedDaysRemaining: number;
    suggestedRestockQuantity: number;
    supplierName?: string;
    supplierId?: string;
    urgency: string;
    recommendationText?: string;
  }>>([]);

  const [dbData, setDbData] = useState<{
    demandPredictions?: Array<{ product: string; demand: string; confidence: string; trend: string }>;
    recommendations?: Array<{ priority: string; color: string; title: string; subtitle?: string; saving?: string; actionText: string; productId?: string; suggestedRestockQuantity?: number; supplierId?: string }>;
    dbActivities?: Array<{ id: string; title: string; time: string; type: string }>;
    healthBreakdown?: { sales: string; inventory: string; purchasing: string; customers: string; finance: string; summaryText: string };
    salesReportData?: Array<{ month: string; revenue: number }>;
    counts?: { productsCount: number; salesCount: number; customersCount: number; suppliersCount: number; purchasesCount: number; totalRevenue: number; totalPurchases: number };
    replenishmentSummary?: { criticalCount: number; deadStockCount: number; totalProducts: number };
  }>({});

  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const fetchInsightsData = async () => {
    setIsLoading(true);
    try {
      const { getAiInsightsData } = await import('@/app/actions/ai');
      const res = await getAiInsightsData();
      if (res.success && res.data) {
        if (res.data.insightsData) setInsightsData(res.data.insightsData);
        if (res.data.predictionsData) setPredictionsData(res.data.predictionsData);
        if (res.data.replenishmentAdvisor) setReplenishmentItems(res.data.replenishmentAdvisor);
        setDbData(res.data);
      }
    } catch (err) {
      console.error("fetchInsightsData error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInsightsData();
  }, []);

  const handleOpenOrderModal = (item: ReplenishmentItem) => {
    setOrderConfirmModal({ isOpen: true, item, orderQty: item.suggestedRestockQuantity, targetStatus: "Delivered" });
  };

  const handleGenerateDraftPO = async (productId: string, quantity: number, supplierId?: string, targetStatus: "Delivered" | "Ordered" = "Delivered") => {
    setGeneratingPoId(productId);
    try {
      const { generateDraftPOFromAI } = await import('@/app/actions/purchases');
      const res = await generateDraftPOFromAI(productId, quantity, supplierId, targetStatus);
      if (res.success && res.data) {
        setOrderConfirmModal(null);
        setPoSuccessModal({
          isOpen: true,
          poNumber: res.data.poNumber,
          productName: res.data.productName,
          sku: orderConfirmModal?.item.sku || '',
          supplierName: res.data.supplierName,
          quantity: res.data.quantity,
          unitCost: res.data.unitCost,
          totalAmount: res.data.totalAmount,
          message: res.message || `Draft PO ${res.data.poNumber} telah berhasil dibuat!`,
          createdAt: new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }),
        });
        await fetchInsightsData();
      } else {
        alert(res.error || 'Gagal membuat Draft PO.');
      }
    } catch (err: unknown) {
      console.error('Generate Draft PO error:', err);
      alert('Terjadi kesalahan saat membuat Draft PO.');
    } finally {
      setGeneratingPoId(null);
    }
  };


  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    setIsAiLoading(true);
    setAiResponse("");

    try {
      const { askAI } = await import('@/app/actions/ai');
      const actionRes = await askAI(promptInput);
      if (actionRes.success && actionRes.answer) {
        setAiResponse(actionRes.answer);
      } else {
        setAiResponse('Gagal terhubung dengan FlowERP Gemini AI Assistant.');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error pada AI Assistant';
      setAiResponse(`AI Error: ${errorMsg}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/Login");
  };

  return (
    <div className={`flex h-screen bg-gray-50 ${isDark ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
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
          onRefresh={fetchInsightsData}
          isLoading={isLoading}
          searchPlaceholder="Search insights..."
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 p-6">
            {/* Page container: keeps spacing consistent with dashboard */}
            <div className="max-w-7xl mx-auto">
              {/* Top bar (title + actions) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold">AI Insight</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Artificial Intelligence analyzes your business data and provides smart recommendations.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm text-sm hover:shadow-md transition">Export Analysis</button>
                  <button className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm text-sm hover:shadow-md transition">Generate Report</button>
                  <button onClick={() => setIsAiModalOpen(true)} className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md shadow hover:shadow-sky-500/20 transition flex items-center gap-2 font-medium"><Bot size={16}/> Ask AI</button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <Card>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-sky-50 rounded-lg"><Brain className="text-sky-600" /></div>
                      <div>
                        <div className="text-xs text-slate-500">AI Business Score</div>
                        <div className="text-2xl font-semibold">{insightsData ? insightsData.businessScore : '92'}% <span className="ml-2 inline-flex items-center text-emerald-600 text-sm font-medium">{insightsData ? insightsData.healthChange : '+5%'}</span></div>
                        <div className="text-xs text-slate-400">Business health this month</div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-50 rounded-lg"><TrendingUp className="text-sky-600" /></div>
                    <div>
                      <div className="text-xs text-slate-500">Revenue Forecast</div>
                      <div className="text-2xl font-semibold">${insightsData ? insightsData.revenueForecast.toLocaleString() : '0'} <span className="ml-2 text-emerald-600 text-sm">{insightsData ? insightsData.forecastChange : '+14%'}</span></div>
                      <div className="text-xs text-slate-400">prediction next month</div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-50 rounded-lg"><PackageSearch className="text-sky-600" /></div>
                    <div>
                      <div className="text-xs text-slate-500">Inventory Risk</div>
                      <div className="text-2xl font-semibold">{insightsData ? insightsData.inventoryRiskCount : '0'} Products <span className="ml-2 inline-flex items-center text-amber-500 text-sm">Low Stock Alert</span></div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-50 rounded-lg"><Sparkles className="text-sky-600" /></div>
                    <div>
                      <div className="text-xs text-slate-500">AI Recommendations</div>
                      <div className="text-2xl font-semibold">{insightsData ? insightsData.aiRecommendationsCount : '0'} <span className="ml-2 inline-flex items-center bg-sky-100 text-sky-700 px-2 py-0.5 text-xs rounded font-medium">New</span></div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* Business Health Analysis - large */}
                <div className="lg:col-span-2">
                  <Card className="h-full">
                    <div className="flex flex-col lg:flex-row gap-6 items-center">
                      <div className="flex-1 flex items-center justify-center">
                        <div className="relative w-44 h-44">
                          <svg viewBox="0 0 36 36" className="w-44 h-44">
                            <path d="M18 2.0845a15.9155 15.9155 0 1 0 0 31.831" fill="none" stroke="#e0f2fe" strokeWidth="4" strokeLinecap="round"/>
                            <path d="M18 2.0845a15.9155 15.9155 0 1 0 0 31.831" fill="none" stroke="#0284c7" strokeWidth="4" strokeDasharray={`${insightsData ? insightsData.businessScore : 88} 100`} strokeLinecap="round" style={{transition: 'stroke-dasharray 0.8s ease'}}/>
                            <text x="18" y="20" alignmentBaseline="middle" textAnchor="middle" fill="currentColor" className="text-xl font-bold">{insightsData ? insightsData.businessScore : 92}</text>
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">Business Health Analysis</h3>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <SmallScore label="Sales" value={dbData.healthBreakdown?.sales || "85%"} />
                          <SmallScore label="Inventory" value={dbData.healthBreakdown?.inventory || "90%"} />
                          <SmallScore label="Purchasing" value={dbData.healthBreakdown?.purchasing || "88%"} />
                          <SmallScore label="Customers" value={dbData.healthBreakdown?.customers || "82%"} />
                          <SmallScore label="Finance" value={dbData.healthBreakdown?.finance || "86%"} />
                        </div>
                        <p className="text-sm text-slate-500 mt-4">{dbData.healthBreakdown?.summaryText || "Analisis kesehatan bisnis Anda dihitung secara dinamis dari performa penjualan, ketersediaan stok produk, dan interaksi transaksi."}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* AI Recommendations column */}
                <div>
                  <Card>
                    <h3 className="text-lg font-semibold">AI Recommendations</h3>
                    <div className="mt-4 space-y-3">
                      {dbData.recommendations && dbData.recommendations.length > 0 ? (
                        dbData.recommendations.map((rec, idx) => (
                          <RecommendationCard key={idx} priority={rec.priority} color={rec.color} title={rec.title} subtitle={rec.subtitle} saving={rec.saving} actionText={rec.actionText}/>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 py-2">Belum ada rekomendasi khusus. Tambahkan produk atau transaksi untuk mengaktifkan insight AI.</p>
                      )}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Sales Forecast & Demand Prediction */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-stretch">
                <div className="lg:col-span-2 flex flex-col">
                  <Card className="h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Sales Forecast</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">AI sales revenue projections & accuracy analysis</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                          +14% Growth
                        </span>
                      </div>

                      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
                        <div className="flex-1 flex flex-col justify-between bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl p-4 min-h-44">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Projection Summary</span>
                            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">Live DB Data</span>
                          </div>
                          
                          <div className="my-auto py-4 flex flex-col items-center justify-center text-center">
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">
                              ${dbData.counts ? dbData.counts.totalRevenue.toLocaleString() : '0'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Recorded Revenue across {dbData.counts ? dbData.counts.salesCount : 0} Completed Orders
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                            <span>Base: Live Sales Orders</span>
                            <span>Model: Gemini ERP AI</span>
                          </div>
                        </div>

                        <div className="w-full lg:w-60 flex flex-col justify-between space-y-2">
                          <StatRow label="Forecast Accuracy" value="96%"/>
                          <StatRow label="AI Confidence" value="High"/>
                          <StatRow label="Trend" value="Growing"/>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Demand Prediction */}
                <div className="flex flex-col">
                  <Card className="h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Demand Prediction</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">AI product demand forecast</p>
                        </div>
                        <span className="rounded-full bg-sky-50 dark:bg-sky-950 px-2.5 py-0.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60">
                          Live AI
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {dbData.demandPredictions && dbData.demandPredictions.length > 0 ? (
                          dbData.demandPredictions.map((dp, idx) => (
                            <DemandCard key={idx} product={dp.product} demand={dp.demand} confidence={dp.confidence} trend={dp.trend} />
                          ))
                        ) : (
                          <div className="py-6 text-center">
                            <p className="text-xs text-slate-400 dark:text-slate-500">Belum ada data prediksi permintaan di database.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Inventory Optimization */}
              {/* AI Reorder & Smart Replenishment Advisor */}
              <div className="mt-6">
                <Card className="border-sky-200/80 dark:border-sky-900/50 shadow-md">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-sky-500/20 shadow-md">
                        <Bot size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            AI Reorder & Smart Replenishment Advisor
                          </h3>
                          <span className="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                            Sales Velocity Engine 30 Hari
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Analisis otomatis kecepatan penjualan 30 hari terakhir untuk mencegah keterlambatan re-order barang populer dan penumpukan stok mati (Dead Stock).
                        </p>
                      </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start md:self-auto text-xs font-medium">
                      <button
                        onClick={() => setAdvisorFilter("all")}
                        className={`px-3 py-1.5 rounded-md transition ${advisorFilter === "all" ? "bg-white dark:bg-slate-700 shadow-xs font-semibold text-sky-600 dark:text-sky-400" : "text-slate-600 dark:text-slate-400"}`}
                      >
                        Semua ({replenishmentItems.length})
                      </button>
                      <button
                        onClick={() => setAdvisorFilter("reorder")}
                        className={`px-3 py-1.5 rounded-md transition ${advisorFilter === "reorder" ? "bg-white dark:bg-slate-700 shadow-xs font-semibold text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"}`}
                      >
                        Perlu Reorder ({replenishmentItems.filter(i => i.urgency === "Critical" || i.urgency === "High").length})
                      </button>
                      <button
                        onClick={() => setAdvisorFilter("deadstock")}
                        className={`px-3 py-1.5 rounded-md transition ${advisorFilter === "deadstock" ? "bg-white dark:bg-slate-700 shadow-xs font-semibold text-purple-600 dark:text-purple-400" : "text-slate-600 dark:text-slate-400"}`}
                      >
                        Stok Mati ({replenishmentItems.filter(i => i.urgency === "Dead Stock").length})
                      </button>
                    </div>
                  </div>

                  {/* Recommendations Cards & Table */}
                  <div className="mt-4 space-y-4">
                    {(() => {
                      const filtered = replenishmentItems.filter(item => {
                        if (advisorFilter === "reorder") return item.urgency === "Critical" || item.urgency === "High";
                        if (advisorFilter === "deadstock") return item.urgency === "Dead Stock";
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                            <CheckCircle2 className="mx-auto text-emerald-500 w-10 h-10 mb-2" />
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tidak ada produk dalam kategori ini.</p>
                            <p className="text-xs text-slate-400 mt-1">Stok inventaris Anda dalam kondisi optimal sesuai analisis AI sales velocity.</p>
                          </div>
                        );
                      }

                      return filtered.map((item) => {
                        const isGenerating = generatingPoId === item.productId;
                        return (
                          <div
                            key={item.productId}
                            className={`p-4 rounded-xl border transition-all ${
                              item.urgency === "Critical"
                                ? "bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50"
                                : item.urgency === "High"
                                ? "bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50"
                                : item.urgency === "Dead Stock"
                                ? "bg-purple-50/70 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900/50"
                                : "bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 dark:text-white text-base">
                                    {item.productName}
                                  </span>
                                  <span className="text-xs font-mono text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                    SKU: {item.sku}
                                  </span>
                                  <span
                                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                      item.urgency === "Critical"
                                        ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                                        : item.urgency === "High"
                                        ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                                        : item.urgency === "Dead Stock"
                                        ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                                        : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                                    }`}
                                  >
                                    {item.urgency === "Critical"
                                      ? "CRITICAL (Stok Kritis)"
                                      : item.urgency === "High"
                                      ? "REORDER NEEDED"
                                      : item.urgency === "Dead Stock"
                                      ? "DEAD STOCK (Stok Mati)"
                                      : "OPTIMAL"}
                                  </span>
                                </div>

                                {/* Dynamic AI Recommendation text quote */}
                                <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-start gap-2">
                                  <Sparkles size={16} className="text-sky-500 shrink-0 mt-0.5" />
                                  <span>{item.recommendationText}</span>
                                </div>

                                {/* Analytics Metrics summary */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                                  <div className="bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 block text-[10px]">Stok Saat Ini:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      {item.currentStock} unit
                                    </span>{" "}
                                    <span className="text-[10px] text-slate-400">(Min: {item.minimumStock})</span>
                                  </div>
                                  <div className="bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 block text-[10px]">Penjualan 30 Hari:</span>
                                    <span className="font-bold text-sky-600 dark:text-sky-400">
                                      {item.salesVelocity30Days} unit
                                    </span>{" "}
                                    <span className="text-[10px] text-slate-400">({item.dailyVelocity}/hari)</span>
                                  </div>
                                  <div className="bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 block text-[10px]">Estimasi Stok Habis:</span>
                                    <span className={`font-bold ${item.estimatedDaysRemaining <= 5 ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200"}`}>
                                      {item.estimatedDaysRemaining > 300 ? "> 30 Hari (Stok Mati)" : `${item.estimatedDaysRemaining} Hari`}
                                    </span>
                                  </div>
                                  <div className="bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 block text-[10px]">Supplier Rujukan:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate block" title={item.supplierName}>
                                      {item.supplierName}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-center">
                                {item.urgency !== "Dead Stock" && (
                                  <button
                                    onClick={() => handleOpenOrderModal(item)}
                                    disabled={isGenerating}
                                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-sky-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                  >
                                    {isGenerating ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Membuat PO...</span>
                                      </>
                                    ) : (
                                      <>
                                        <ShoppingCart className="w-4 h-4" />
                                        <span>Buat Purchase Order</span>
                                      </>
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => router.push('/ProductInventory')}
                                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 transition text-center"
                                >
                                  Kelola Stok
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </Card>
              </div>

              {/* ─── Order Confirmation Modal ─── */}
              {orderConfirmModal && (
                <Dialog open={orderConfirmModal.isOpen} onOpenChange={(open) => !open && setOrderConfirmModal(null)}>
                  <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
                    {/* Header - sticky */}
                    <div className="bg-sky-600 px-6 py-4 flex items-center gap-3 shrink-0">
                      <ShoppingCart className="h-5 w-5 text-white" />
                      <h3 className="text-base font-bold text-white">Konfirmasi Purchase Order</h3>
                    </div>

                    <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
                      {/* Product info */}
                      <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="p-2 bg-sky-100 dark:bg-sky-950 rounded-lg">
                          <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{orderConfirmModal.item.productName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">SKU: {orderConfirmModal.item.sku} &bull; Supplier: {orderConfirmModal.item.supplierName}</p>
                          <p className="text-xs text-slate-500">Stok saat ini: <span className="font-semibold text-rose-600">{orderConfirmModal.item.currentStock} unit</span> (Min: {orderConfirmModal.item.minimumStock})</p>
                        </div>
                      </div>

                      {/* Unit Price */}
                      <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Harga per Unit (Cost Price)</span>
                        <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                          {orderConfirmModal.item.costPrice > 0
                            ? `$${orderConfirmModal.item.costPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : <span className="text-xs text-slate-400">Belum ada harga</span>}
                        </span>
                      </div>

                      {/* Qty Input */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Jumlah yang Dipesan</label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setOrderConfirmModal(prev => prev ? { ...prev, orderQty: Math.max(1, prev.orderQty - 1) } : null)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition text-lg"
                          >−</button>
                          <input
                            type="number"
                            min="1"
                            value={orderConfirmModal.orderQty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setOrderConfirmModal(prev => prev ? { ...prev, orderQty: Math.max(1, val) } : null);
                            }}
                            className="flex-1 h-10 text-center text-base font-bold border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                          <button
                            type="button"
                            onClick={() => setOrderConfirmModal(prev => prev ? { ...prev, orderQty: prev.orderQty + 1 } : null)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition text-lg"
                          >+</button>
                        </div>
                        <p className="text-xs text-slate-400">Rekomendasi AI: {orderConfirmModal.item.suggestedRestockQuantity} unit</p>
                      </div>

                      {/* Order Status Option */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status Pembelian & Update Stok</label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => setOrderConfirmModal(prev => prev ? { ...prev, targetStatus: "Delivered" } : null)}
                            className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                              orderConfirmModal.targetStatus === "Delivered"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            }`}
                          >
                            <CheckCircle2 size={14} />
                            <span>Langsung Terima & Tambah Stok</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderConfirmModal(prev => prev ? { ...prev, targetStatus: "Ordered" } : null)}
                            className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                              orderConfirmModal.targetStatus === "Ordered"
                                ? "bg-sky-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            }`}
                          >
                            <Clock size={14} />
                            <span>Draft PO (Menunggu Pengiriman)</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {orderConfirmModal.targetStatus === "Delivered"
                            ? "✅ Stok produk akan langsung bertambah di database (+ " + orderConfirmModal.orderQty + " unit)."
                            : "⏳ Barang akan dipesan (stok bertambah ketika diset 'Delivered' di menu Purchases)."}
                        </p>
                      </div>

                      {/* Live Price Breakdown */}
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rincian Harga</p>
                        </div>
                        <div className="px-4 py-3 space-y-2 text-sm">
                          <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Harga per Unit</span>
                            <span>${orderConfirmModal.item.costPrice > 0 ? orderConfirmModal.item.costPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Jumlah Order</span>
                            <span>× {orderConfirmModal.orderQty} unit</span>
                          </div>
                          <div className="flex justify-between font-bold text-base text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span>Total</span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ${(orderConfirmModal.item.costPrice * orderConfirmModal.orderQty).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Action buttons - sticky footer */}
                    <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                      <button
                        onClick={() => setOrderConfirmModal(null)}
                        className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleGenerateDraftPO(orderConfirmModal.item.productId, orderConfirmModal.orderQty, orderConfirmModal.item.supplierId, orderConfirmModal.targetStatus)}
                        disabled={generatingPoId === orderConfirmModal.item.productId}
                        className="flex-1 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {generatingPoId === orderConfirmModal.item.productId ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /><span>Memproses...</span></>
                        ) : (
                          <><FileText className="w-4 h-4" /><span>Konfirmasi & Process PO</span></>
                        )}
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* ─── Invoice Modal after PO Created ─── */}
              {poSuccessModal && (
                <Dialog open={poSuccessModal.isOpen} onOpenChange={(open) => !open && setPoSuccessModal(null)}>
                  <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0 rounded-2xl overflow-hidden">
                    {/* Invoice Header */}
                    <div className="bg-emerald-600 px-6 py-4 text-white flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5" />
                      <div>
                        <h3 className="text-base font-bold">Purchase Order Dibuat!</h3>
                        <p className="text-xs text-emerald-100">{poSuccessModal.createdAt}</p>
                      </div>
                    </div>

                    {/* Invoice Body */}
                    <div className="px-6 py-5 space-y-4">
                      {/* PO Number badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nomor PO</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm bg-sky-50 dark:bg-sky-950 px-3 py-1 rounded-full border border-sky-200 dark:border-sky-800">{poSuccessModal.poNumber}</span>
                      </div>

                      {/* Invoice Line Items */}
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 grid grid-cols-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                          <span>Item</span>
                          <span className="text-center">Qty</span>
                          <span className="text-right">Subtotal</span>
                        </div>
                        <div className="px-4 py-3">
                          <div className="grid grid-cols-3 items-center gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{poSuccessModal.productName}</p>
                              <p className="text-[11px] text-slate-400">{poSuccessModal.sku} &bull; @${poSuccessModal.unitCost > 0 ? poSuccessModal.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}/unit</p>
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">{poSuccessModal.quantity} unit</p>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">
                              ${(poSuccessModal.unitCost * poSuccessModal.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-slate-500">
                          <span>Supplier</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{poSuccessModal.supplierName}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Unit Cost</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">${poSuccessModal.unitCost > 0 ? poSuccessModal.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Jumlah</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{poSuccessModal.quantity} unit</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-base">
                          <span className="text-slate-700 dark:text-slate-300">Grand Total</span>
                          <span className="text-emerald-600 dark:text-emerald-400 text-lg">${poSuccessModal.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <p className="text-xs text-center text-slate-400 dark:text-slate-500">Draft PO telah tersimpan di database dan siap diproses oleh tim purchasing.</p>

                      {/* CTA */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPoSuccessModal(null)}
                          className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition"
                        >
                          Tutup
                        </button>
                        <button
                          onClick={() => { setPoSuccessModal(null); router.push('/Purchases'); }}
                          className="flex-1 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-md transition flex items-center justify-center gap-2"
                        >
                          <FileText size={15} />
                          <span>Lihat di Purchases</span>
                        </button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}


              {/* Customer & Supplier Intelligence */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 grid">
                  <Card>
                    <h3 className="text-lg font-semibold">Customer Intelligence</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg flex flex-col items-center justify-center text-center">
                        <div className="text-3xl font-bold text-sky-600">{dbData.counts?.customersCount || 0}</div>
                        <div className="text-xs text-slate-500 mt-1">Total Terdaftar di DB</div>
                      </div>
                      <div className="space-y-2">
                        <StatRow label="Registered Customers" value={`${dbData.counts?.customersCount || 0} Customers`}/>
                        <StatRow label="Active Suppliers" value={`${dbData.counts?.suppliersCount || 0} Suppliers`}/>
                        <StatRow label="Purchase Orders" value={`${dbData.counts?.purchasesCount || 0} Orders`}/>
                        <StatRow label="Total Purchases" value={`$${(dbData.counts?.totalPurchases || 0).toLocaleString()}`}/>
                      </div>
                    </div>
                  </Card>
                </div>

                <div>
                  <Card>
                    <h3 className="text-lg font-semibold">Supplier Intelligence</h3>
                    <div className="mt-4 space-y-3">
                      <InfoRow icon={<CircleCheck className="text-emerald-500" />} label="Active Suppliers" value={`${dbData.counts?.suppliersCount || 0} Suppliers`} />
                      <InfoRow icon={<Activity className="text-sky-500" />} label="Total Purchases" value={`$${(dbData.counts?.totalPurchases || 0).toLocaleString()}`} />
                      <InfoRow icon={<DollarSign className="text-amber-500" />} label="Purchase Volume" value={`${dbData.counts?.purchasesCount || 0} POs`} />
                      <InfoRow icon={<AlertTriangle className="text-rose-500" />} label="Risk Score" value="Low" />
                    </div>
                  </Card>
                </div>
              </div>

              {/* Recent AI Activities & Chat */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2">
                  <Card>
                    <h3 className="text-lg font-semibold">Recent AI Activities</h3>
                    <ul className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      {dbData.dbActivities && dbData.dbActivities.length > 0 ? (
                        dbData.dbActivities.map((act) => (
                          <li key={act.id} className="flex items-start gap-3">
                            <CircleCheck className="text-emerald-500 shrink-0 mt-0.5"/>
                            <div>
                              <div className="font-medium">{act.title}</div>
                              <div className="text-xs text-slate-400">{act.time}</div>
                            </div>
                          </li>
                        ))
                      ) : (
                        <>
                          <li className="flex items-start gap-3"><CircleCheck className="text-emerald-500 shrink-0 mt-0.5"/> <div><div className="font-medium">AI system database synchronization</div><div className="text-xs text-slate-400">Just now</div></div></li>
                          <li className="flex items-start gap-3"><BarChart3 className="text-sky-500 shrink-0 mt-0.5"/> <div><div className="font-medium">Sales forecast updated from real DB</div><div className="text-xs text-slate-400">Today</div></div></li>
                        </>
                      )}
                    </ul>
                  </Card>
                </div>

                <div>
                  <Card>
                    <h3 className="text-lg font-semibold">AI Chat Assistant</h3>
                    <div className="mt-3 space-y-3">
                      {aiResponse ? (
                        <div className="p-3 bg-sky-50 dark:bg-slate-800/80 rounded border border-sky-100 dark:border-slate-700 text-xs">
                          <p className="font-semibold text-sky-600 mb-1">AI Response:</p>
                          <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap line-clamp-4">{aiResponse}</p>
                        </div>
                      ) : (
                        <>
                          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded text-xs">User: How can I increase sales?</div>
                          <div className="p-3 bg-sky-50/50 dark:bg-slate-800/50 rounded text-xs text-slate-700 dark:text-slate-300">AI: Based on live data, restocking low-stock items can boost revenue by 12%.</div>
                        </>
                      )}
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!promptInput.trim()) return;
                        setIsAiModalOpen(true);
                        handleSendPrompt(e);
                      }} className="flex gap-2">
                        <input
                          value={promptInput}
                          onChange={(e) => setPromptInput(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="Ask AI about your business..."
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded shrink-0 transition"
                        >
                          Ask
                        </button>
                      </form>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-white" />
              <h3 className="text-lg font-bold text-white">FlowERP AI Assistant</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAiModalOpen(false)}
              className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="p-6 space-y-4">
            {aiResponse ? (
              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 text-sm text-slate-800 dark:border-sky-900/40 dark:bg-slate-800 dark:text-slate-200">
                <p className="font-semibold text-sky-600 mb-1">AI Insight Answer:</p>
                <p className="whitespace-pre-wrap">{aiResponse}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Tanyakan apapun seputar omzet, performa penjualan, prediksi stok habis, atau analisis pelanggan bisnis Anda.</p>
            )}

            <form onSubmit={handleSendPrompt} className="flex gap-2">
              <Input
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Contoh: Berapa omzet bulan ini dan stok apa yang hampir habis?"
                className="flex-1"
              />
              <button
                type="submit"
                disabled={isAiLoading || !promptInput.trim()}
                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({children, className=''}: {children: React.ReactNode, className?: string}){
  return (
    <div className={"bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 "+className}>
      {children}
    </div>
  )
}

function SmallScore({label,value}:{label:string,value:string}){
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md flex flex-col">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

function RecommendationCard({priority,color,title,subtitle,saving,actionText}:{priority:string,color?:string,title:string,subtitle?:string,saving?:string,actionText:string}){
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${color||'bg-sky-50'}`}>
      <div>
        <div className="text-xs text-slate-500">Priority <span className="font-semibold ml-2">{priority}</span></div>
        <div className="font-medium mt-1">{title}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
        {saving && <div className="text-sm text-slate-600 mt-1">Estimated saving <span className="font-semibold">{saving}</span></div>}
      </div>
      <div>
        <button className="px-3 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium">{actionText}</button>
      </div>
    </div>
  )
}

function DemandCard({
  product,
  demand,
  confidence,
  trend,
}: {
  product: string;
  demand: string;
  confidence: string;
  trend: string;
}) {
  const isHigh = demand.toLowerCase() === 'high';
  const isMedium = demand.toLowerCase() === 'medium';

  const badgeClass = isHigh
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
    : isMedium
    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'
    : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/60';

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/80">
      <div className="flex flex-col min-w-0 pr-2">
        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
          {product}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Confidence: <strong className="font-medium text-slate-700 dark:text-slate-300">{confidence}</strong> • {trend}
        </span>
      </div>

      <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${badgeClass}`}>
        {demand}
      </span>
    </div>
  );
}

function StatRow({label,value}:{label:string,value:string}){
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}

function InfoRow({icon,label,value}:{icon:React.ReactNode,label:string,value:string}){
  return (
    <div className="flex items-center justify-between p-2">
      <div className="flex items-center gap-3"><div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">{icon}</div><div className="text-sm">{label}</div></div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}