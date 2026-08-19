/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import Sidebar from "@/components/ui/layout/sidebar";
import Topbar from "@/components/ui/layout/topbar";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  TrendingUp,
  PackageSearch,
  Sparkles,
  Bot,
  ShoppingCart,
  CheckCircle2,
  FileText,
  Camera,
  UploadCloud,
  Zap,
  ShieldAlert,
  Percent,
  ArrowRight,
  RefreshCw,
  Send,
  Loader2,
  Check,
  Tag,
  DollarSign,
  Boxes,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertTriangle,
} from "lucide-react";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

import {
  scanReceiptWithAI,
  saveOcrToExpense,
  saveOcrToPurchaseOrder,
  executeAiCopilotCommand,
  getFraudAndAnomalyAudit,
  getDynamicPricingRecommendations,
  applyDynamicPricingDiscount,
  type OcrExtractedData,
  type CopilotActionResult,
  type AnomalyAuditReport,
  type PricingRecommendation,
} from '@/app/actions/ai-advanced';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'ocr' | 'copilot' | 'fraud' | 'pricing'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Ask AI Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [promptInput, setPromptInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Overview / Replenishment States
  const [generatingPoId, setGeneratingPoId] = useState<string | null>(null);
  const [advisorFilter, setAdvisorFilter] = useState<"all" | "reorder" | "deadstock">("all");
  const [replenishmentItems, setReplenishmentItems] = useState<ReplenishmentItem[]>([]);
  const [insightsData, setInsightsData] = useState<any>(null);
  const [dbData, setDbData] = useState<any>({});

  // PO Confirmation Modal
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

  // 1. OCR Scanner States
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrExtractedData | null>(null);
  const [isSavingOcr, setIsSavingOcr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Copilot States
  const [copilotInput, setCopilotInput] = useState("");
  const [isCopilotExecuting, setIsCopilotExecuting] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<Array<{
    sender: 'user' | 'copilot';
    text: string;
    actionResult?: CopilotActionResult;
    timestamp: string;
  }>>([
    {
      sender: 'copilot',
      text: 'Halo! Saya **FlowERP AI Copilot**. Anda dapat menginstruksikan saya untuk membuat Sales Order, mencatat beban operasional, atau menyesuaikan stok barang rusak secara langsung di database.',
      timestamp: 'Sekarang',
    },
  ]);

  // Feature C1: Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  // 3. Fraud & Anomaly States (Feature C2: Sound Alert)
  const [auditReport, setAuditReport] = useState<AnomalyAuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  // const [anomalyFilter, setAnomalyFilter] = useState<string>('ALL');
  const [soundAlertEnabled, setSoundAlertEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("flowerp_sound_alert") !== "false";
    }
    return true;
  });

  // Feature C2: Web Audio Synthesizer Chime
  const playChimeAlert = () => {
    if (typeof window === "undefined" || !soundAlertEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio chime alert:", e);
    }
  };

  // Feature C1: Web Speech Recognition Handler
  const handleToggleVoiceRecognition = () => {
    if (typeof window === "undefined") return;

    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      toast.info("Perekaman suara dihentikan.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Browser Anda tidak mendukung Web Speech Recognition. Silakan gunakan Google Chrome atau Microsoft Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "id-ID";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Mendengarkan suara kasir/staf... Silakan berbicara.");
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setCopilotInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error !== "no-speech") {
          toast.error(`Speech recognition: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Speech recognition error:", err);
      setIsListening(false);
      toast.error("Gagal mengaktifkan mikrofon: " + err.message);
    }
  };

  // 4. Dynamic Pricing States
  const [pricingRecommendations, setPricingRecommendations] = useState<PricingRecommendation[]>([]);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [applyingDiscountId, setApplyingDiscountId] = useState<string | null>(null);

  // Initial Data Fetching
  const fetchInsightsData = async () => {
    setIsLoading(true);
    try {
      const { getAiInsightsData } = await import('@/app/actions/ai');
      const res = await getAiInsightsData();
      if (res.success && res.data) {
        if (res.data.insightsData) setInsightsData(res.data.insightsData);
        if (res.data.replenishmentAdvisor) setReplenishmentItems(res.data.replenishmentAdvisor);
        setDbData(res.data);
      }
    } catch (err) {
      console.error("fetchInsightsData error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFraudAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await getFraudAndAnomalyAudit();
      if (res.success && res.data) {
        setAuditReport(res.data);
        const hasRisk = res.data.overallRisk === 'CRITICAL' || res.data.overallRisk === 'HIGH' || res.data.anomalies.some(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');
        if (hasRisk) {
          playChimeAlert();
        }
      }
    } catch (err) {
      console.error("fetchFraudAudit error:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const fetchDynamicPricing = async () => {
    setIsPricingLoading(true);
    try {
      const res = await getDynamicPricingRecommendations();
      if (res.success && res.recommendations) {
        setPricingRecommendations(res.recommendations);
      }
    } catch (err) {
      console.error("fetchDynamicPricing error:", err);
    } finally {
      setIsPricingLoading(false);
    }
  };

  useEffect(() => {
    fetchInsightsData();
    fetchFraudAudit();
    fetchDynamicPricing();
  }, []);

  // --- OCR Handlers ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setOcrImagePreview(base64);
        triggerOcrScan(base64, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerOcrScan = async (base64Data: string, mimeType = 'image/jpeg') => {
    setIsScanning(true);
    setOcrResult(null);
    try {
      const res = await scanReceiptWithAI(base64Data, mimeType);
      if (res.success && res.data) {
        setOcrResult(res.data);
        toast.success(`OCR Berhasil: Diekstrak dari ${res.data.vendor}`);
      } else {
        toast.error(res.error || 'Gagal memindai struk');
      }
    } catch (err: any) {
      toast.error('Error saat memindai: ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSampleReceipt = (type: 'bensin' | 'supplier' | 'listrik' | 'atk') => {
    const samples: Record<string, OcrExtractedData> = {
      bensin: {
        vendor: 'SPBU Pertamina 34-10201',
        invoiceNumber: `STRUK-BBM-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        category: 'Logistics',
        suggestedType: 'EXPENSE',
        items: [{ name: 'BBM Pertalite Operasional Armada Toko', quantity: 1, unitPrice: 150000, total: 150000 }],
        subtotal: 150000,
        tax: 0,
        totalAmount: 150000,
        notes: 'Pengisian bensin motor kurir pengantaran barang',
        confidence: 98,
      },
      supplier: {
        vendor: 'PT Sumber Makmur Nusantara',
        invoiceNumber: `INV-SMN-${Math.floor(10000 + Math.random() * 90000)}`,
        date: new Date().toISOString().split('T')[0],
        category: 'Bahan Baku',
        suggestedType: 'PURCHASE_ORDER',
        items: [
          { name: 'Pengadaan Kemasan Kardus Box', quantity: 200, unitPrice: 2500, total: 500000 },
          { name: 'Bahan Baku Mentah Grade A', quantity: 50, unitPrice: 15000, total: 750000 },
        ],
        subtotal: 1250000,
        tax: 125000,
        totalAmount: 1375000,
        notes: 'Faktur pengadaan bahan baku bulanan',
        confidence: 95,
      },
      listrik: {
        vendor: 'PLN Persero (IDPEL 5321098)',
        invoiceNumber: `PLN-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        category: 'Utilities',
        suggestedType: 'EXPENSE',
        items: [{ name: 'Tagihan Listrik Prabayar & Kantor', quantity: 1, unitPrice: 450000, total: 450000 }],
        subtotal: 450000,
        tax: 45000,
        totalAmount: 495000,
        notes: 'Listrik operasional toko dan pendingin',
        confidence: 99,
      },
      atk: {
        vendor: 'Toko Stationery & Print Sejahtera',
        invoiceNumber: `NOTA-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().split('T')[0],
        category: 'Operational',
        suggestedType: 'EXPENSE',
        items: [
          { name: 'Kertas Thermal Roll POS (10 Roll)', quantity: 10, unitPrice: 6000, total: 60000 },
          { name: 'Tinta Ribbon Barcode Printer', quantity: 1, unitPrice: 45000, total: 45000 },
        ],
        subtotal: 105000,
        tax: 0,
        totalAmount: 105000,
        notes: 'Perlengkapan kasir kas masuk/keluar',
        confidence: 94,
      },
    };

    setOcrResult(samples[type]);
    setOcrImagePreview(null);
    toast.success(`Struk sampel "${samples[type].vendor}" berhasil dimuat!`);
  };

  const handleSaveExpense = async () => {
    if (!ocrResult) return;
    setIsSavingOcr(true);
    try {
      const res = await saveOcrToExpense({
        vendor: ocrResult.vendor,
        category: ocrResult.category,
        amount: ocrResult.totalAmount,
        date: ocrResult.date,
        invoiceNumber: ocrResult.invoiceNumber,
        notes: ocrResult.notes,
      });
      if (res.success) {
        toast.success(res.message);
        setOcrResult(null);
        setOcrImagePreview(null);
        fetchInsightsData();
      } else {
        toast.error(res.error || 'Gagal menyimpan beban');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSavingOcr(false);
    }
  };

  const handleSavePO = async () => {
    if (!ocrResult) return;
    setIsSavingOcr(true);
    try {
      const res = await saveOcrToPurchaseOrder({
        vendor: ocrResult.vendor,
        totalAmount: ocrResult.totalAmount,
        items: ocrResult.items,
        invoiceNumber: ocrResult.invoiceNumber,
      });
      if (res.success) {
        toast.success(res.message);
        setOcrResult(null);
        setOcrImagePreview(null);
        fetchInsightsData();
      } else {
        toast.error(res.error || 'Gagal membuat PO');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSavingOcr(false);
    }
  };

  // --- Copilot Handlers ---
  const handleExecuteCopilot = async (commandToRun?: string) => {
    const cmd = commandToRun || copilotInput;
    if (!cmd.trim()) return;

    const userMsg = {
      sender: 'user' as const,
      text: cmd,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setCopilotMessages(prev => [...prev, userMsg]);
    if (!commandToRun) setCopilotInput("");
    setIsCopilotExecuting(true);

    try {
      const res = await executeAiCopilotCommand(cmd);
      const copilotMsg = {
        sender: 'copilot' as const,
        text: res.message,
        actionResult: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setCopilotMessages(prev => [...prev, copilotMsg]);
      if (res.success) {
        toast.success(res.title);
        fetchInsightsData();
      }
    } catch (err: any) {
      setCopilotMessages(prev => [
        ...prev,
        {
          sender: 'copilot',
          text: `Gagal mengeksekusi aksi: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsCopilotExecuting(false);
    }
  };

  // --- Dynamic Pricing Handlers ---
  const handleApplyDiscount = async (item: PricingRecommendation) => {
    setApplyingDiscountId(item.productId);
    try {
      const res = await applyDynamicPricingDiscount(item.productId, item.newPrice);
      if (res.success) {
        toast.success(res.message);
        await fetchDynamicPricing();
        await fetchInsightsData();
      } else {
        toast.error(res.error || 'Gagal memperbarui harga diskon');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setApplyingDiscountId(null);
    }
  };

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
        toast.error(res.error || 'Gagal membuat Draft PO.');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat membuat Draft PO: ' + err.message);
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
    } catch (err: any) {
      setAiResponse(`AI Error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDark={isDark}
          setIsDark={setIsDark}
          onRefresh={() => {
            fetchInsightsData();
            fetchFraudAudit();
            fetchDynamicPricing();
          }}
          isLoading={isLoading || isAuditing || isPricingLoading}
          searchPlaceholder="Cari insight AI..."
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-linear-to-tr from-sky-600 to-indigo-600 rounded-2xl text-white shadow-md shadow-sky-500/20">
                    <Brain className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                      FlowERP <span className="bg-linear-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">AI Innovations</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Sistem kecerdasan artifisial generasi baru: OCR Vision, Actionable Copilot, Fraud Detection, & Dynamic Pricing
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setIsAiModalOpen(true)}
                  className="bg-linear-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Bot className="w-4 h-4" /> Tanya Gemini AI
                </Button>
              </div>
            </div>

            {/* 5-Tab Navigation Bar */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 pb-px">
              {[
                { id: 'overview', label: 'Overview & Replenishment', icon: Sparkles, badge: null },
                { id: 'ocr', label: 'AI Smart OCR Scanner', icon: Camera, badge: 'Vision' },
                { id: 'copilot', label: 'AI ERP Copilot Actions', icon: Zap, badge: 'Actionable' },
                { id: 'fraud', label: 'AI Fraud & Anomaly', icon: ShieldAlert, badge: auditReport?.totalAnomaliesCount ? `${auditReport.totalAnomaliesCount} Alerts` : null },
                { id: 'pricing', label: 'Dynamic Pricing & Markdown', icon: Percent, badge: pricingRecommendations.length ? `${pricingRecommendations.length} Deals` : null },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-t-xl transition-all whitespace-nowrap cursor-pointer border-b-2 ${
                      active
                        ? 'border-sky-600 text-sky-600 bg-sky-50/50 dark:bg-sky-950/30 dark:text-sky-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        tab.badge.includes('Alert') ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: OVERVIEW & REPLENISHMENT ADVISOR */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-3 bg-sky-50 dark:bg-sky-900/30 text-sky-600 rounded-xl">
                        <Brain className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Health Score</div>
                        <div className="text-2xl font-bold">{insightsData?.businessScore || 92}%</div>
                        <div className="text-xs text-emerald-600 font-medium">{insightsData?.healthChange || '+5%'} vs bulan lalu</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Revenue Forecast</div>
                        <div className="text-2xl font-bold">${insightsData?.revenueForecast?.toLocaleString() || '0'}</div>
                        <div className="text-xs text-emerald-600 font-medium">+14% Growth Trend</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                        <PackageSearch className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Inventory Risk</div>
                        <div className="text-2xl font-bold">{insightsData?.inventoryRiskCount || 0} Produk</div>
                        <div className="text-xs text-amber-500 font-medium">Stok Kritis / Restock</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">AI Recommendations</div>
                        <div className="text-xl font-bold">{insightsData?.aiRecommendationsCount || 3} Rekomendasi</div>
                        <div className="text-xs text-indigo-600 font-medium">Live Actions Ready</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Replenishment Advisor Table */}
                <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800 overflow-hidden">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ShoppingCart className="text-sky-600 w-5 h-5" />
                        AI Replenishment Advisor (Smart Auto-Restock)
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-1">
                        Analisis burn-rate penjualan 30 hari untuk prediksi tanggal kehabisan stok & rekomendasi Purchase Order otomatis
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAdvisorFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          advisorFilter === "all" ? "bg-sky-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        Semua ({replenishmentItems.length})
                      </button>
                      <button
                        onClick={() => setAdvisorFilter("reorder")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          advisorFilter === "reorder" ? "bg-rose-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        Perlu Reorder ({replenishmentItems.filter(i => i.urgency === 'Critical' || i.urgency === 'High').length})
                      </button>
                      <button
                        onClick={() => setAdvisorFilter("deadstock")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          advisorFilter === "deadstock" ? "bg-amber-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        Dead Stock ({replenishmentItems.filter(i => i.urgency === 'Dead Stock').length})
                      </button>
                    </div>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                          <th className="px-6 py-4">Produk & SKU</th>
                          <th className="px-6 py-4">Sisa Stok</th>
                          <th className="px-6 py-4">Sales Velocity</th>
                          <th className="px-6 py-4">Estimasi Habis</th>
                          <th className="px-6 py-4">Status AI</th>
                          <th className="px-6 py-4 text-right">Aksi Cepat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {replenishmentItems
                          .filter(item => {
                            if (advisorFilter === 'reorder') return item.urgency === 'Critical' || item.urgency === 'High';
                            if (advisorFilter === 'deadstock') return item.urgency === 'Dead Stock';
                            return true;
                          })
                          .map((item) => (
                            <tr key={item.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                              <td className="px-6 py-4">
                                <div className="font-semibold text-slate-900 dark:text-white">{item.productName}</div>
                                <div className="text-xs text-slate-500 font-mono">{item.sku}</div>
                              </td>
                              <td className="px-6 py-4 font-medium">
                                {item.currentStock} unit (Min: {item.minimumStock})
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-semibold">{item.salesVelocity30Days} unit</span> / 30h
                                <div className="text-[11px] text-slate-400">~{item.dailyVelocity} unit/hari</div>
                              </td>
                              <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                                {item.estimatedDaysRemaining > 365 ? '>365 Hari' : `${item.estimatedDaysRemaining} Hari`}
                              </td>
                              <td className="px-6 py-4">
                                <Badge className={
                                  item.urgency === 'Critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                                  item.urgency === 'High' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                                  item.urgency === 'Dead Stock' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                }>
                                  {item.urgency}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {(item.urgency === 'Critical' || item.urgency === 'High') ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenOrderModal(item)}
                                    className="bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs cursor-pointer shadow-xs"
                                  >
                                    Auto Draft PO (+{item.suggestedRestockQuantity})
                                  </Button>
                                ) : item.urgency === 'Dead Stock' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setActiveTab('pricing')}
                                    className="border-amber-500 text-amber-600 hover:bg-amber-50 rounded-lg text-xs cursor-pointer"
                                  >
                                    Diskon AI
                                  </Button>
                                ) : (
                                  <span className="text-xs text-slate-400">Stok Optimal</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        {replenishmentItems.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                              Belum ada katalog produk di database.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 2: AI SMART OCR RECEIPT & INVOICE SCANNER */}
            {activeTab === 'ocr' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Upload & Scanner Zone */}
                  <div className="lg:col-span-5 space-y-4">
                    <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Camera className="w-5 h-5 text-sky-600" />
                          Upload / Foto Struk Fisik
                        </CardTitle>
                        <p className="text-xs text-slate-500">
                          Gemini Vision OCR mengekstrak Vendor, Tanggal, Item, Pajak, dan Total secara otomatis
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          className="hidden"
                        />

                        {ocrImagePreview ? (
                          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 max-h-64 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={ocrImagePreview} alt="Struk Preview" className="object-contain max-h-64 w-full" />
                            <button
                              onClick={() => {
                                setOcrImagePreview(null);
                                setOcrResult(null);
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-white rounded-lg text-xs"
                            >
                              Ganti Foto
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-sky-300 dark:border-sky-800 hover:border-sky-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-sky-50/40 dark:bg-sky-950/20 cursor-pointer transition-colors text-center"
                          >
                            <div className="p-3 bg-sky-100 dark:bg-sky-900/50 rounded-2xl text-sky-600">
                              <UploadCloud className="w-8 h-8" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">Klik untuk upload foto bon / struk</p>
                              <p className="text-xs text-slate-500 mt-0.5">Mendukung JPG, PNG, WEBP, atau struk kamera HP</p>
                            </div>
                          </div>
                        )}

                        {/* Sample One-Click Pill Buttons for instant testing */}
                        <div>
                          <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                            Atau Uji Coba Sampel Cepat:
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleSampleReceipt('bensin')}
                              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-left hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition-all cursor-pointer"
                            >
                              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">⛽ Struk BBM Pertamina</div>
                              <div className="text-[11px] text-slate-500">Rp 150.000 (Beban Bensin)</div>
                            </button>
                            <button
                              onClick={() => handleSampleReceipt('supplier')}
                              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-left hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition-all cursor-pointer"
                            >
                              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">📦 Faktur Supplier PT SMN</div>
                              <div className="text-[11px] text-slate-500">Rp 1.375.000 (Auto PO)</div>
                            </button>
                            <button
                              onClick={() => handleSampleReceipt('listrik')}
                              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-left hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition-all cursor-pointer"
                            >
                              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">💡 Tagihan Listrik PLN</div>
                              <div className="text-[11px] text-slate-500">Rp 495.000 (Beban Utilitas)</div>
                            </button>
                            <button
                              onClick={() => handleSampleReceipt('atk')}
                              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-left hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition-all cursor-pointer"
                            >
                              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">🧾 Nota ATK & Kertas Kasir</div>
                              <div className="text-[11px] text-slate-500">Rp 105.000 (Operasional)</div>
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right: AI OCR Extracted Result & 1-Click Save */}
                  <div className="lg:col-span-7">
                    <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800 h-full">
                      <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                            Hasil Ekstraksi Gemini Vision OCR
                          </CardTitle>
                          {ocrResult && (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              {ocrResult.confidence}% Akurat
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        {isScanning ? (
                          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                            <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
                            <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">Gemini Vision sedang membaca teks dan angka pada struk...</p>
                            <p className="text-xs text-slate-400">Mendeteksi nama merchant, tanggal, item rincian, dan pajak</p>
                          </div>
                        ) : ocrResult ? (
                          <div className="space-y-6">
                            {/* Vendor & General Info */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                              <div>
                                <div className="text-xs text-slate-500">Merchant / Vendor</div>
                                <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{ocrResult.vendor}</div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-500">No. Invoice / Ref</div>
                                <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{ocrResult.invoiceNumber}</div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-500">Tanggal Transaksi</div>
                                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 mt-0.5">{ocrResult.date}</div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-500">Kategori Disarankan</div>
                                <Badge variant="outline" className="mt-1 text-xs">{ocrResult.category}</Badge>
                              </div>
                              <div className="col-span-2">
                                <div className="text-xs text-slate-500">Catatan AI</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">{ocrResult.notes}</div>
                              </div>
                            </div>

                            {/* Extracted Line Items */}
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Rincian Item Terdeteksi</div>
                              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase">
                                    <tr>
                                      <th className="px-4 py-2.5">Item</th>
                                      <th className="px-4 py-2.5 text-center">Qty</th>
                                      <th className="px-4 py-2.5 text-right">Harga Satuan</th>
                                      <th className="px-4 py-2.5 text-right">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {ocrResult.items.map((item, idx) => (
                                      <tr key={idx}>
                                        <td className="px-4 py-2.5 font-medium">{item.name}</td>
                                        <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                                        <td className="px-4 py-2.5 text-right">Rp {item.unitPrice.toLocaleString('id-ID')}</td>
                                        <td className="px-4 py-2.5 text-right font-semibold">Rp {item.total.toLocaleString('id-ID')}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Total summary */}
                            <div className="flex justify-between items-center p-4 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-100 dark:border-sky-900/50">
                              <div>
                                <div className="text-xs text-sky-800 dark:text-sky-300 font-medium">Subtotal: Rp {ocrResult.subtotal.toLocaleString('id-ID')} | Pajak: Rp {ocrResult.tax.toLocaleString('id-ID')}</div>
                                <div className="text-lg font-bold text-sky-950 dark:text-sky-100">Total: Rp {ocrResult.totalAmount.toLocaleString('id-ID')}</div>
                              </div>
                            </div>

                            {/* 1-Click Action Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              <Button
                                onClick={handleSaveExpense}
                                disabled={isSavingOcr}
                                className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl cursor-pointer shadow-sm py-2.5 flex items-center justify-center gap-2"
                              >
                                {isSavingOcr ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                                Simpan ke Beban Kas (Expense)
                              </Button>

                              <Button
                                onClick={handleSavePO}
                                disabled={isSavingOcr}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer shadow-sm py-2.5 flex items-center justify-center gap-2"
                              >
                                {isSavingOcr ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                Buat Purchase Order (PO Supplier)
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="py-16 flex flex-col items-center justify-center gap-2 text-center text-slate-400">
                            <Camera className="w-10 h-10 stroke-1" />
                            <p className="font-semibold text-sm">Belum ada struk yang dipindai</p>
                            <p className="text-xs max-w-sm">Upload foto bon fisik di sebelah kiri atau pilih salah satu tombol sampel untuk melihat kekuatan AI Vision OCR.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: AI ERP COPILOT (ACTIONABLE FUNCTION CALLING) */}
            {activeTab === 'copilot' && (
              <div className="space-y-6">
                <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800 overflow-hidden">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Zap className="w-5 h-5 text-amber-500" />
                          AI Actionable Copilot Terminal
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-1">
                          Instruksikan aksi bisnis melalui percakapan alami. AI langsung membuat transaksi, memotong stok, atau mencatat beban di database.
                        </p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        Function Calling Active
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Command Quick Pills */}
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                        Contoh Perintah Eksekusi Nyata:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'AI, buatkan penawaran untuk PT Samudra 20 unit Laptop Lenovo',
                          'AI, kurangi 3 unit SKU-004 karena barang pecah di gudang',
                          'AI, catat beban listrik operasional Rp 500.000',
                          'AI, catat biaya bensin operasional kurir Rp 120.000',
                        ].map((sampleCmd, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleExecuteCopilot(sampleCmd)}
                            disabled={isCopilotExecuting}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium bg-slate-50 hover:bg-sky-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 transition-all text-left cursor-pointer"
                          >
                            ⚡ {sampleCmd}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chat Log Window */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 min-h-95 max-h-115 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                      {copilotMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                        >
                          <div className={`max-w-2xl rounded-2xl p-4 text-sm ${
                            msg.sender === 'user'
                              ? 'bg-sky-600 text-white rounded-br-none'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs rounded-bl-none'
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>

                            {/* Structured Action Result Card if Copilot executed an action */}
                            {msg.actionResult && msg.actionResult.actionType !== 'INQUIRY' && (
                              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4" /> {msg.actionResult.title}
                                  </span>
                                  <Badge className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                    {msg.actionResult.actionType}
                                  </Badge>
                                </div>

                                {msg.actionResult.details && (
                                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
                                    {Object.entries(msg.actionResult.details).map(([k, v]) => (
                                      <div key={k}>
                                        <span className="text-slate-400">{k}: </span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {msg.actionResult.link && (
                                  <Button
                                    size="sm"
                                    onClick={() => router.push(msg.actionResult!.link!)}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-xs cursor-pointer mt-2"
                                  >
                                    {msg.actionResult.linkText || 'Buka Halaman'} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                        </div>
                      ))}

                      {isCopilotExecuting && (
                        <div className="flex items-center gap-2 text-xs text-sky-600 font-medium p-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>AI Copilot sedang memvalidasi stok & mengeksekusi instruksi ke database...</span>
                        </div>
                      )}
                    </div>

                    {/* Feature C1: Voice Speech-to-Text Input Bar */}
                    <div className="space-y-2">
                      {isListening && (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 animate-pulse">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                            <span className="font-semibold">Mendengarkan ucapan kasir/staf... Silakan bicara.</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleVoiceRecognition}
                            className="text-[11px] font-bold text-rose-600 underline hover:text-rose-800 cursor-pointer"
                          >
                            Berhenti
                          </button>
                        </div>
                      )}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleExecuteCopilot();
                        }}
                        className="flex gap-2"
                      >
                        <Input
                          value={copilotInput}
                          onChange={(e) => setCopilotInput(e.target.value)}
                          placeholder="Ketik atau gunakan mikrofon... (misal: 'AI, buatkan penawaran untuk PT Samudra 10 unit Laptop')"
                          className="rounded-xl flex-1"
                          disabled={isCopilotExecuting}
                        />

                        {/* Mic Speech-to-Text Button */}
                        <Button
                          type="button"
                          onClick={handleToggleVoiceRecognition}
                          className={`rounded-xl px-3.5 transition cursor-pointer ${
                            isListening
                              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-md shadow-rose-500/30'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200'
                          }`}
                          title={isListening ? 'Berhenti merekam suara' : 'Bicara via Mikrofon (Speech-to-Text)'}
                        >
                          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>

                        {/* Send Action Button */}
                        <Button
                          type="submit"
                          disabled={isCopilotExecuting || !copilotInput.trim()}
                          className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl cursor-pointer px-5"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 4: AI ANOMALY & FRAUD DETECTION */}
            {activeTab === 'fraud' && (
              <div className="space-y-6">
                {/* Feature C2: Visual Flashing Sound/Risk Alert Banner */}
                {auditReport && (auditReport.overallRisk === 'CRITICAL' || auditReport.overallRisk === 'HIGH') && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 rounded-2xl flex items-center justify-between gap-4 animate-pulse shadow-md shadow-rose-500/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-rose-600 text-white rounded-xl">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-rose-800 dark:text-rose-200">
                          Peringatan Risiko Tinggi: Anomali Transaksi Terdeteksi!
                        </h4>
                        <p className="text-xs text-rose-600 dark:text-rose-300">
                          AI Audit mendeteksi pola transaksi mencurigakan atau lonjakan pengeluaran beban kas. Harap periksa mitigasi di bawah.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={playChimeAlert}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-xl shrink-0 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 mr-1" /> Uji Bunyi Alarm
                    </Button>
                  </div>
                )}

                {/* Risk Score Summary Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800 md:col-span-1">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-500">Skor Risiko Fraud & Kebocoran</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2 flex flex-col items-center justify-center text-center">
                      <div className={`text-4xl font-black ${
                        auditReport?.overallRisk === 'CRITICAL' || auditReport?.overallRisk === 'HIGH'
                          ? 'text-rose-600'
                          : auditReport?.overallRisk === 'MEDIUM'
                          ? 'text-amber-500'
                          : 'text-emerald-600'
                      }`}>
                        {auditReport?.overallRisk || 'LOW'}
                      </div>
                      <div className="text-xs font-semibold text-slate-400 mt-1">
                        Tingkat Risiko: {auditReport?.riskScore || 8}/100
                      </div>
                      <p className="text-xs text-slate-500 mt-3 max-w-xs">
                        {auditReport?.summary || 'Audit otomatis memindai diskon janggal, lonjakan beban, dan kehilangan stok.'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800 md:col-span-2">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <ShieldAlert className="w-5 h-5 text-rose-500" />
                          Pusat Audit Keamanan & Pencegahan Fraud
                        </CardTitle>
                        <p className="text-xs text-slate-500">Audit otomatis realtime terakhir: {auditReport?.lastAudited || 'Sekarang'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Audio Chime Alert Toggle */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const nextVal = !soundAlertEnabled;
                            setSoundAlertEnabled(nextVal);
                            if (typeof window !== "undefined") {
                              localStorage.setItem("flowerp_sound_alert", String(nextVal));
                            }
                            if (nextVal) {
                              playChimeAlert();
                              toast.success("Suara peringatan anomali diaktifkan (ON)");
                            } else {
                              toast.info("Suara peringatan anomali dinonaktifkan (OFF)");
                            }
                          }}
                          className={`rounded-lg text-xs cursor-pointer border ${
                            soundAlertEnabled
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'border-slate-300 text-slate-500'
                          }`}
                          title="Toggle Suara Peringatan Audio Anomali"
                        >
                          {soundAlertEnabled ? <Volume2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 mr-1" />}
                          Audio: {soundAlertEnabled ? 'ON' : 'OFF'}
                        </Button>

                        <Button
                          size="sm"
                          onClick={fetchFraudAudit}
                          disabled={isAuditing}
                          className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-xs cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isAuditing ? 'animate-spin' : ''}`} />
                          Scan Audit Ulang
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                          <div className="text-xs text-slate-500">Diskon Ekstrem</div>
                          <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                            {auditReport?.anomalies.filter(a => a.type === 'DISCOUNT_FRAUD').length || 0}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                          <div className="text-xs text-slate-500">Lonjakan Biaya</div>
                          <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                            {auditReport?.anomalies.filter(a => a.type === 'EXPENSE_SPIKE').length || 0}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                          <div className="text-xs text-slate-500">Kehilangan Stok</div>
                          <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                            {auditReport?.anomalies.filter(a => a.type === 'STOCK_SHRINKAGE').length || 0}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                          <div className="text-xs text-slate-500">Jam Janggal</div>
                          <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                            {auditReport?.anomalies.filter(a => a.type === 'OFF_HOURS').length || 0}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Anomaly Alerts List */}
                <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 pb-4">
                    <CardTitle className="text-base">Daftar Temuan Anomali & Rekomendasi Mitigasi</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {auditReport?.anomalies && auditReport.anomalies.length > 0 ? (
                      auditReport.anomalies.map((anom) => (
                        <div
                          key={anom.id}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 shadow-2xs space-y-2 hover:border-sky-500 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge className={
                                anom.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                                anom.severity === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              }>
                                {anom.severity}
                              </Badge>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{anom.title}</span>
                            </div>
                            <span className="text-xs text-slate-400">{anom.date} | Ref: {anom.affectedRecord || '-'}</span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300">{anom.description}</p>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <div className="text-slate-500">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Rekomendasi AI: </span>
                              {anom.recommendation}
                            </div>
                            {anom.amount && (
                              <span className="font-bold text-rose-600">Nilai: ${anom.amount.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">Tidak ada anomali atau indikasi fraud</p>
                        <p className="text-xs">Seluruh transaksi penjualan, beban kas, dan pergerakan stok berjalan dalam batas kewajaran.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 5: AI DYNAMIC PRICING & MARKDOWN OPTIMIZER */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                {/* Header info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800 p-5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Potensi Cash Velocity Reclaimed</div>
                      <div className="text-2xl font-bold text-emerald-600">
                        ${pricingRecommendations.reduce((acc, p) => acc + p.projectedCashReclaimed, 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">Likuidasi modal stok mati</div>
                    </div>
                  </Card>

                  <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800 p-5 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                      <Boxes className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Produk Dead / Slow Stock</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {pricingRecommendations.length} Item
                      </div>
                      <div className="text-xs text-slate-400">Direkomendasikan diskon optimal</div>
                    </div>
                  </Card>

                  <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800 p-5 flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                      <Tag className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Margin Terlindungi di Atas HPP</div>
                      <div className="text-2xl font-bold text-indigo-600">100% Aman</div>
                      <div className="text-xs text-slate-400">Tidak menjual di bawah modal pokok</div>
                    </div>
                  </Card>
                </div>

                {/* Markdown Recommendations Table */}
                <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800 overflow-hidden">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 pb-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Percent className="w-5 h-5 text-indigo-600" />
                        Rekomendasi Diskon & Markdown Produk Dead Stock
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-1">
                        Sistem mengalkulasi persentase diskon optimal untuk mencairkan modal tanpa merugi di bawah HPP
                      </p>
                    </div>
                  </CardHeader>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                          <th className="px-6 py-4">Produk & SKU</th>
                          <th className="px-6 py-4">Sisa Stok</th>
                          <th className="px-6 py-4">Modal HPP / Harga Sekarang</th>
                          <th className="px-6 py-4">Saran Diskon AI</th>
                          <th className="px-6 py-4">Harga Baru & Sisa Margin</th>
                          <th className="px-6 py-4 text-right">Aksi 1-Click</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pricingRecommendations.map((p) => (
                          <tr key={p.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900 dark:text-white">{p.name}</div>
                              <div className="text-xs text-slate-400 font-mono">{p.sku} | {p.category}</div>
                              <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">{p.reasoning}</div>
                            </td>
                            <td className="px-6 py-4 font-semibold">
                              {p.stock} unit
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs text-slate-400">HPP: ${p.costPrice.toFixed(2)}</div>
                              <div className="font-semibold text-slate-700 dark:text-slate-200">${p.currentPrice.toFixed(2)}</div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-bold">
                                -{p.recommendedDiscountPercent}% OFF
                              </Badge>
                              <div className="text-[11px] text-slate-400 mt-1 font-medium">{p.strategy}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-emerald-600">${p.newPrice.toFixed(2)}</div>
                              <div className="text-[11px] text-slate-400">Margin: +{p.remainingMarginPercent}%</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button
                                size="sm"
                                onClick={() => handleApplyDiscount(p)}
                                disabled={applyingDiscountId === p.productId}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs cursor-pointer shadow-xs"
                              >
                                {applyingDiscountId === p.productId ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                                Terapkan Diskon
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {pricingRecommendations.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                              Tidak ada produk berstatus Dead Stock. Seluruh perputaran inventaris berada dalam kondisi sehat!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Auto Draft PO Confirmation Modal */}
      {orderConfirmModal && (
        <Dialog open={orderConfirmModal.isOpen} onOpenChange={(open) => !open && setOrderConfirmModal(null)}>
          <DialogContent className="max-w-md rounded-2xl dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="text-sky-600 w-5 h-5" />
                Konfirmasi Draft Purchase Order
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2 text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1.5 border border-slate-100 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white">{orderConfirmModal.item.productName}</div>
                <div className="text-xs text-slate-500 font-mono">SKU: {orderConfirmModal.item.sku}</div>
                <div className="text-xs text-slate-500">Supplier: <span className="font-semibold text-slate-700 dark:text-slate-300">{orderConfirmModal.item.supplierName}</span></div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Jumlah Pemesanan (Units)</label>
                <Input
                  type="number"
                  value={orderConfirmModal.orderQty}
                  onChange={(e) => setOrderConfirmModal({ ...orderConfirmModal, orderQty: parseInt(e.target.value, 10) || 0 })}
                  className="rounded-xl"
                />
              </div>

              <div className="flex justify-between items-center p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl text-xs font-semibold text-sky-900 dark:text-sky-200">
                <span>Total Biaya Estimasi:</span>
                <span className="text-sm font-bold">${(orderConfirmModal.orderQty * orderConfirmModal.item.costPrice).toLocaleString()}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setOrderConfirmModal(null)} className="flex-1 rounded-xl cursor-pointer">Batal</Button>
                <Button
                  onClick={() => handleGenerateDraftPO(orderConfirmModal.item.productId, orderConfirmModal.orderQty, orderConfirmModal.item.supplierId, orderConfirmModal.targetStatus)}
                  disabled={generatingPoId === orderConfirmModal.item.productId}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white rounded-xl cursor-pointer"
                >
                  {generatingPoId === orderConfirmModal.item.productId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buat Draft PO'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* PO Success Modal */}
      {poSuccessModal && (
        <Dialog open={poSuccessModal.isOpen} onOpenChange={(open) => !open && setPoSuccessModal(null)}>
          <DialogContent className="max-w-md rounded-2xl dark:bg-slate-900 text-center">
            <div className="py-4 flex flex-col items-center gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-full text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <DialogTitle className="text-xl font-bold">Draft PO Berhasil Dibuat!</DialogTitle>
              <p className="text-xs text-slate-500">{poSuccessModal.message}</p>
              <div className="w-full text-left p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs space-y-1 mt-2">
                <div className="flex justify-between"><span className="text-slate-400">No. PO:</span><span className="font-bold">{poSuccessModal.poNumber}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Supplier:</span><span className="font-semibold">{poSuccessModal.supplierName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Total:</span><span className="font-bold text-emerald-600">${poSuccessModal.totalAmount.toLocaleString()}</span></div>
              </div>
              <Button onClick={() => setPoSuccessModal(null)} className="w-full bg-slate-900 dark:bg-slate-700 text-white rounded-xl mt-2 cursor-pointer">Selesai</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Ask Gemini AI Dialog */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="max-w-2xl rounded-2xl dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Bot className="text-sky-600 w-5 h-5" />
              FlowERP Gemini AI Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <form onSubmit={handleSendPrompt} className="flex gap-2">
              <Input
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Tanyakan analisis penjualan, stok habis, atau performa bisnis..."
                className="rounded-xl flex-1"
                disabled={isAiLoading}
              />
              <Button type="submit" disabled={isAiLoading || !promptInput.trim()} className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl cursor-pointer">
                {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kirim'}
              </Button>
            </form>

            {aiResponse && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {aiResponse}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}