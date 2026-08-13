/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Sidebar from '@/components/ui/layout/sidebar';
import Topbar from '@/components/ui/layout/topbar';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  Printer,
  Plus,
  RefreshCw,
  Calendar,
  Building2,
  Receipt,
  Info,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  getReceivables,
  getPayables,
  getReceivablesAging,
  getPayablesAging,
  getFinanceSummary,
  recordReceivablePayment,
  recordPayablePayment,
  getSalesOrderPayments,
  getPurchaseOrderPayments,
  getCustomerBalances,
  getSupplierBalances,
  type ARItem,
  type APItem,
  type PaymentRecord,
  type FinanceSummary,
  type CustomerBalance,
  type SupplierBalance,
} from '@/app/actions/finance';
import { formatPrice } from '@/lib/currency';
import { exportToCSV } from '@/lib/export';

// ─── Badge ────────────────────────────────────────────────────────────────────
function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
    PARTIAL: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
    UNPAID: 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800',
    OVERDUE: 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  };
  const label: Record<string, string> = {
    PAID: 'Lunas', PARTIAL: 'Sebagian', UNPAID: 'Belum Bayar', OVERDUE: 'Jatuh Tempo',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] || map.UNPAID}`}>
      {label[status] || status}
    </span>
  );
}

// ─── Aging Badge ──────────────────────────────────────────────────────────────
function AgingBadge({ days }: { days: number }) {
  if (days <= 30) return <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{days}h (Current)</span>;
  if (days <= 60) return <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{days}h (31–60)</span>;
  if (days <= 90) return <span className="text-xs font-medium text-orange-600 dark:text-orange-400">{days}h (61–90)</span>;
  return <span className="text-xs font-medium text-red-600 dark:text-red-400">{days}h (&gt;90)</span>;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function PaymentProgress({ paid, total, showLabel = true }: { paid: number; total: number; showLabel?: boolean }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
          <span>{formatPrice(paid)} dibayar</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Kuitansi / Receipt Print ─────────────────────────────────────────────────
function printReceipt(payment: PaymentRecord & { partyName: string; orderRef: string; totalAmount: number }) {
  const w = window.open('', '_blank', 'width=420,height=620');
  if (!w) return;
  w.document.write(`
    <!DOCTYPE html><html><head><title>Kuitansi Pembayaran</title>
    <style>
      body{font-family:'Segoe UI',sans-serif;padding:32px;color:#1e293b;font-size:13px}
      .header{text-align:center;border-bottom:2px solid #0ea5e9;padding-bottom:12px;margin-bottom:20px}
      .logo{font-size:22px;font-weight:900;color:#0284c7}
      .subtitle{font-size:11px;color:#64748b;margin-top:2px}
      .ref{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin:14px 0;font-size:15px;font-weight:700;color:#0369a1;text-align:center}
      table{width:100%;border-collapse:collapse;margin:12px 0}
      td{padding:6px 4px;vertical-align:top}
      td:first-child{color:#64748b;width:45%}
      td:last-child{font-weight:600;color:#1e293b}
      .amount{font-size:20px;font-weight:900;color:#0284c7;text-align:center;padding:12px;background:#f0f9ff;border-radius:8px;margin:14px 0}
      .footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:24px;border-top:1px dashed #cbd5e1;padding-top:12px}
      .sign{margin-top:40px;display:flex;justify-content:space-between}
      .sign-box{text-align:center;width:40%}
      .sign-line{border-top:1px solid #1e293b;margin-top:40px;padding-top:4px;font-size:11px}
    </style></head><body>
    <div class="header"><div class="logo">FlowERP</div><div class="subtitle">Kuitansi Pembayaran Resmi</div></div>
    <div class="ref">${payment.referenceNumber}</div>
    <table>
      <tr><td>Kepada / Dari</td><td>${payment.partyName}</td></tr>
      <tr><td>No. Referensi Order</td><td>${payment.orderRef}</td></tr>
      <tr><td>Tanggal Bayar</td><td>${new Date(payment.paymentDate).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</td></tr>
      <tr><td>Metode Pembayaran</td><td>${payment.method}</td></tr>
      ${payment.notes ? `<tr><td>Catatan</td><td>${payment.notes}</td></tr>` : ''}
    </table>
    <div class="amount">Jumlah Dibayar: ${formatPrice(payment.amount)}</div>
    <table>
      <tr><td>Total Tagihan</td><td>${formatPrice(payment.totalAmount)}</td></tr>
    </table>
    <div class="sign">
      <div class="sign-box"><div class="sign-line">Penerima</div></div>
      <div class="sign-box"><div class="sign-line">Pembayar</div></div>
    </div>
    <div class="footer">Dicetak pada ${new Date().toLocaleString('id-ID')} · FlowERP-AI · Dokumen ini sah tanpa tanda tangan basah</div>
    </body></html>
  `);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 500);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FinancePage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState<'ar' | 'ap' | 'customer-bal' | 'supplier-bal' | 'aging'>('ar');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [arList, setArList] = useState<ARItem[]>([]);
  const [apList, setApList] = useState<APItem[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [agingAR, setAgingAR] = useState<any>(null);
  const [agingAP, setAgingAP] = useState<any>(null);
  const [customerBalances, setCustomerBalances] = useState<CustomerBalance[]>([]);
  const [supplierBalances, setSupplierBalances] = useState<SupplierBalance[]>([]);
  const [agingMode, setAgingMode] = useState<'ar' | 'ap'>('ar');

  // Detail / payment modal
  const [selectedAR, setSelectedAR] = useState<ARItem | null>(null);
  const [selectedAP, setSelectedAP] = useState<APItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailPayments, setDetailPayments] = useState<PaymentRecord[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Payment form
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [payForm, setPayForm] = useState({
    amount: '',
    method: 'Bank Transfer',
    notes: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  // ─── Load data ──────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [arRes, apRes, sumRes, agARRes, agAPRes, custRes, suppRes] = await Promise.all([
        getReceivables(),
        getPayables(),
        getFinanceSummary(),
        getReceivablesAging(),
        getPayablesAging(),
        getCustomerBalances(),
        getSupplierBalances(),
      ]);
      if (arRes.success) setArList(arRes.data);
      if (apRes.success) setApList(apRes.data);
      if (sumRes.success) setSummary(sumRes.data);
      if (agARRes.success) setAgingAR(agARRes.data);
      if (agAPRes.success) setAgingAP(agAPRes.data);
      if (custRes.success) setCustomerBalances(custRes.data);
      if (suppRes.success) setSupplierBalances(suppRes.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const handler = () => loadAll();
    window.addEventListener('currency_change', handler);
    return () => window.removeEventListener('currency_change', handler);
  }, [loadAll]);

  // ─── Open detail ────────────────────────────────────────────────────────────
  const openARDetail = async (item: ARItem) => {
    setSelectedAR(item);
    setSelectedAP(null);
    setIsDetailOpen(true);
    setIsLoadingDetail(true);
    const res = await getSalesOrderPayments(item.id);
    if (res.success) setDetailPayments(res.data);
    setIsLoadingDetail(false);
  };

  const openAPDetail = async (item: APItem) => {
    setSelectedAP(item);
    setSelectedAR(null);
    setIsDetailOpen(true);
    setIsLoadingDetail(true);
    const res = await getPurchaseOrderPayments(item.id);
    if (res.success) setDetailPayments(res.data);
    setIsLoadingDetail(false);
  };

  // ─── Open payment form ───────────────────────────────────────────────────────
  const openPayForm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPayError('');
    setPaySuccess('');
    setPayForm({ amount: '', method: 'Bank Transfer', notes: '', paymentDate: new Date().toISOString().split('T')[0] });
    setIsPayOpen(true);
  };

  // ─── Submit payment ──────────────────────────────────────────────────────────
  const submitPayment = async () => {
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) { setPayError('Masukkan jumlah pembayaran yang valid'); return; }

    setIsSubmitting(true);
    setPayError('');
    try {
      let res;
      if (selectedAR) {
        const remaining = selectedAR.remainingBalance;
        if (amount > remaining + 0.01) { setPayError(`Jumlah melebihi sisa tagihan (${formatPrice(remaining)})`); setIsSubmitting(false); return; }
        res = await recordReceivablePayment({
          salesOrderId: selectedAR.id,
          amount,
          method: payForm.method,
          notes: payForm.notes,
          paymentDate: payForm.paymentDate,
        });
      } else if (selectedAP) {
        const remaining = selectedAP.remainingBalance;
        if (amount > remaining + 0.01) { setPayError(`Jumlah melebihi sisa hutang (${formatPrice(remaining)})`); setIsSubmitting(false); return; }
        res = await recordPayablePayment({
          purchaseOrderId: selectedAP.id,
          amount,
          method: payForm.method,
          notes: payForm.notes,
          paymentDate: payForm.paymentDate,
        });
      }

      if (res?.success) {
        setPaySuccess(`Pembayaran berhasil dicatat. No. Ref: ${res.data?.referenceNumber}`);
        await loadAll();
        // Refresh detail
        if (selectedAR) { const r = await getSalesOrderPayments(selectedAR.id); if (r.success) setDetailPayments(r.data); }
        if (selectedAP) { const r = await getPurchaseOrderPayments(selectedAP.id); if (r.success) setDetailPayments(r.data); }
        setTimeout(() => { setIsPayOpen(false); setPaySuccess(''); }, 2500);
      } else {
        setPayError(res?.message || 'Gagal mencatat pembayaran');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Filters ─────────────────────────────────────────────────────────────────
  const filteredAR = arList.filter(item => {
    const q = searchQuery.toLowerCase();
    return !q || item.orderNumber.toLowerCase().includes(q) || item.customer?.name?.toLowerCase().includes(q) || item.customer?.companyName?.toLowerCase().includes(q);
  });

  const filteredAP = apList.filter(item => {
    const q = searchQuery.toLowerCase();
    return !q || item.poNumber.toLowerCase().includes(q) || item.supplier?.name?.toLowerCase().includes(q);
  });

  const filteredCustBal = customerBalances.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q || c.customerName.toLowerCase().includes(q) || (c.companyName || '').toLowerCase().includes(q);
  });

  const filteredSuppBal = supplierBalances.filter(s => {
    const q = searchQuery.toLowerCase();
    return !q || s.supplierName.toLowerCase().includes(q) || (s.companyName || '').toLowerCase().includes(q);
  });

  // ─── Export ──────────────────────────────────────────────────────────────────
  const exportAR = () => exportToCSV('piutang_usaha', filteredAR.map(r => ({
    orderNumber: r.orderNumber,
    customer: r.customer?.name,
    totalAmount: r.totalAmount,
    paidAmount: r.paidAmount,
    remainingBalance: r.remainingBalance,
    status: r.paymentStatus,
    date: new Date(r.createdAt).toLocaleDateString('id-ID'),
  })), [
    { key: 'orderNumber', label: 'No. Order' },
    { key: 'customer', label: 'Pelanggan' },
    { key: 'totalAmount', label: 'Total Tagihan' },
    { key: 'paidAmount', label: 'Sudah Dibayar' },
    { key: 'remainingBalance', label: 'Sisa Piutang' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Tanggal' },
  ]);

  const exportAP = () => exportToCSV('hutang_usaha', filteredAP.map(r => ({
    poNumber: r.poNumber,
    supplier: r.supplier?.name,
    totalAmount: r.totalAmount,
    paidAmount: r.paidAmount,
    remainingBalance: r.remainingBalance,
    status: r.paymentStatus,
    date: new Date(r.createdAt).toLocaleDateString('id-ID'),
  })), [
    { key: 'poNumber', label: 'No. PO' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'totalAmount', label: 'Total Hutang' },
    { key: 'paidAmount', label: 'Sudah Dibayar' },
    { key: 'remainingBalance', label: 'Sisa Hutang' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Tanggal' },
  ]);

  const exportCustBal = () => exportToCSV('saldo_piutang_per_pelanggan', filteredCustBal.map(c => ({
    customerName: c.customerName,
    companyName: c.companyName || '-',
    orderCount: c.orderCount,
    totalBilled: c.totalBilled,
    totalPaid: c.totalPaid,
    totalOutstanding: c.totalOutstanding,
  })), [
    { key: 'customerName', label: 'Pelanggan' },
    { key: 'companyName', label: 'Perusahaan' },
    { key: 'orderCount', label: 'Jml Order' },
    { key: 'totalBilled', label: 'Total Tagihan' },
    { key: 'totalPaid', label: 'Sudah Dibayar' },
    { key: 'totalOutstanding', label: 'Sisa Piutang' },
  ]);

  const exportSuppBal = () => exportToCSV('saldo_hutang_per_supplier', filteredSuppBal.map(s => ({
    supplierName: s.supplierName,
    companyName: s.companyName || '-',
    orderCount: s.orderCount,
    totalBilled: s.totalBilled,
    totalPaid: s.totalPaid,
    totalOutstanding: s.totalOutstanding,
  })), [
    { key: 'supplierName', label: 'Supplier' },
    { key: 'companyName', label: 'Perusahaan' },
    { key: 'orderCount', label: 'Jml PO' },
    { key: 'totalBilled', label: 'Total Hutang' },
    { key: 'totalPaid', label: 'Sudah Dibayar' },
    { key: 'totalOutstanding', label: 'Sisa Hutang' },
  ]);

  // ─── Aging helpers ────────────────────────────────────────────────────────────
  const currentAging = agingMode === 'ar' ? agingAR : agingAP;
  const agingBuckets = currentAging
    ? [
        { label: 'Current (0–30 hari)', key: 'current', color: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', items: currentAging.current },
        { label: '31–60 Hari', key: 'days30', color: 'bg-amber-400', light: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', items: currentAging.days30 },
        { label: '61–90 Hari', key: 'days60', color: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', items: currentAging.days60 },
        { label: '>90 Hari (Kritis)', key: 'days90Plus', color: 'bg-red-500', light: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', items: currentAging.days90Plus },
      ]
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'ar', label: 'Piutang (AR)', icon: ArrowDownCircle, count: filteredAR.length },
    { id: 'ap', label: 'Hutang (AP)', icon: ArrowUpCircle, count: filteredAP.length },
    { id: 'customer-bal', label: 'Saldo Pelanggan', icon: Users, count: filteredCustBal.length },
    { id: 'supplier-bal', label: 'Saldo Supplier', icon: Building2, count: filteredSuppBal.length },
    { id: 'aging', label: 'Aging Report', icon: Clock, count: null },
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'dark' : ''}`}>
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDark={isDark}
          setIsDark={setIsDark}
          onRefresh={loadAll}
          isLoading={isLoading}
          searchPlaceholder="Cari order, pelanggan, supplier..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 overflow-y-auto">
          {/* ── Header ── */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Keuangan</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Piutang Usaha (AR) · Hutang Usaha (AP) · Aging Report</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  if (activeTab === 'ar') exportAR();
                  else if (activeTab === 'ap') exportAP();
                  else if (activeTab === 'customer-bal') exportCustBal();
                  else if (activeTab === 'supplier-bal') exportSuppBal();
                  else exportAR();
                }} className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </Button>
                <Button size="sm" onClick={loadAll} disabled={isLoading} className="gap-1.5 text-xs bg-sky-600 hover:bg-sky-700">
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 max-w-7xl mx-auto">

            {/* ── KPI Summary Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Piutang', value: formatPrice(summary?.totalReceivables ?? 0), icon: ArrowDownCircle, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/50' },
                { label: 'Total Hutang', value: formatPrice(summary?.totalPayables ?? 0), icon: ArrowUpCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/50' },
                { label: 'AR Terbuka', value: String(summary?.openARCount ?? 0), icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/50' },
                { label: 'AP Terbuka', value: String(summary?.openAPCount ?? 0), icon: Receipt, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/50' },
                { label: 'AR Overdue', value: String(summary?.overdueReceivables ?? 0), icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/50' },
                { label: 'AP Overdue', value: String(summary?.overduePayables ?? 0), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/50' },
              ].map((card) => (
                <div key={card.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-2`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{card.value}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</div>
                </div>
              ))}
            </div>

            {/* ── Tabs ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex border-b border-slate-200 dark:border-slate-800">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      activeTab === tab.id
                        ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== null && (
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── AR Tab ── */}
              {activeTab === 'ar' && (
                <div>
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <Info className="w-4 h-4 text-sky-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Daftar tagihan pelanggan yang belum atau baru sebagian dibayar</span>
                  </div>
                  {isLoading ? (
                    <div className="p-12 flex justify-center">
                      <RefreshCw className="w-6 h-6 text-sky-500 animate-spin" />
                    </div>
                  ) : filteredAR.length === 0 ? (
                    <div className="p-12 text-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Tidak ada piutang terbuka</p>
                      <p className="text-xs text-slate-400 mt-1">Semua tagihan pelanggan telah lunas</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAR.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => openARDetail(item)}
                          className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center shrink-0">
                                <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 dark:text-white text-sm truncate">{item.customer?.name || '-'}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">{item.orderNumber}</div>
                              </div>
                            </div>
                            <div className="hidden md:flex flex-col items-end shrink-0 w-48">
                              <PaymentProgress paid={item.paidAmount} total={item.totalAmount} />
                            </div>
                            <div className="text-right shrink-0 space-y-1">
                              <div className="text-sm font-bold text-slate-900 dark:text-white">{formatPrice(item.remainingBalance)}</div>
                              <div className="text-[10px] text-slate-400">dari {formatPrice(item.totalAmount)}</div>
                            </div>
                            <div className="shrink-0">
                              <PaymentBadge status={item.paymentStatus} />
                            </div>
                            <Button
                              size="sm"
                              className="shrink-0 text-xs bg-sky-600 hover:bg-sky-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); setSelectedAR(item); setSelectedAP(null); openPayForm(e); }}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Catat Bayar
                            </Button>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            {item.salesperson?.fullName && <span>Sales: {item.salesperson.fullName}</span>}
                            <span>{item.payments.length} pembayaran tercatat</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── AP Tab ── */}
              {activeTab === 'ap' && (
                <div>
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <Info className="w-4 h-4 text-rose-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Daftar hutang ke supplier yang belum atau baru sebagian dibayar</span>
                  </div>
                  {isLoading ? (
                    <div className="p-12 flex justify-center">
                      <RefreshCw className="w-6 h-6 text-rose-400 animate-spin" />
                    </div>
                  ) : filteredAP.length === 0 ? (
                    <div className="p-12 text-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Tidak ada hutang terbuka</p>
                      <p className="text-xs text-slate-400 mt-1">Semua hutang ke supplier telah lunas</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAP.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => openAPDetail(item)}
                          className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center shrink-0">
                                <Building2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 dark:text-white text-sm truncate">{item.supplier?.name || '-'}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">{item.poNumber}</div>
                              </div>
                            </div>
                            <div className="hidden md:flex flex-col items-end shrink-0 w-48">
                              <PaymentProgress paid={item.paidAmount} total={item.totalAmount} />
                            </div>
                            <div className="text-right shrink-0 space-y-1">
                              <div className="text-sm font-bold text-slate-900 dark:text-white">{formatPrice(item.remainingBalance)}</div>
                              <div className="text-[10px] text-slate-400">dari {formatPrice(item.totalAmount)}</div>
                            </div>
                            <div className="shrink-0">
                              <PaymentBadge status={item.paymentStatus} />
                            </div>
                            <Button
                              size="sm"
                              className="shrink-0 text-xs bg-rose-600 hover:bg-rose-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); setSelectedAP(item); setSelectedAR(null); openPayForm(e); }}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Catat Bayar
                            </Button>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span>{item.payments.length} pembayaran tercatat</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Customer Balance Tab ── */}
              {activeTab === 'customer-bal' && (
                <div>
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Rekap saldo sisa piutang per pelanggan — gabungan dari seluruh transaksi yang belum lunas</span>
                  </div>
                  {isLoading ? (
                    <div className="p-12 flex justify-center"><RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" /></div>
                  ) : filteredCustBal.length === 0 ? (
                    <div className="p-12 text-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Semua piutang pelanggan telah lunas</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left px-5 py-3 font-semibold">Pelanggan</th>
                            <th className="text-center px-4 py-3 font-semibold">Jml Order</th>
                            <th className="text-right px-4 py-3 font-semibold">Total Tagihan</th>
                            <th className="text-right px-4 py-3 font-semibold">Sudah Dibayar</th>
                            <th className="text-right px-4 py-3 font-semibold">Sisa Piutang</th>
                            <th className="px-4 py-3 hidden lg:table-cell w-36">Progres</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredCustBal.map((c) => (
                            <tr key={c.customerId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0">
                                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-900 dark:text-white">{c.customerName}</div>
                                    {c.companyName && <div className="text-xs text-slate-400">{c.companyName}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold">{c.orderCount}</span>
                              </td>
                              <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-300">{formatPrice(c.totalBilled)}</td>
                              <td className="px-4 py-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatPrice(c.totalPaid)}</td>
                              <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white">{formatPrice(c.totalOutstanding)}</td>
                              <td className="px-4 py-4 hidden lg:table-cell">
                                <PaymentProgress paid={c.totalPaid} total={c.totalBilled} showLabel={false} />
                                <div className="text-[10px] text-slate-400 mt-1 text-right">{c.totalBilled > 0 ? Math.round((c.totalPaid / c.totalBilled) * 100) : 0}% lunas</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700 font-semibold">
                            <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-300">TOTAL ({filteredCustBal.length} pelanggan)</td>
                            <td className="px-4 py-3 text-center text-sm">{filteredCustBal.reduce((s, c) => s + c.orderCount, 0)}</td>
                            <td className="px-4 py-3 text-right text-sm">{formatPrice(filteredCustBal.reduce((s, c) => s + c.totalBilled, 0))}</td>
                            <td className="px-4 py-3 text-right text-sm text-emerald-600">{formatPrice(filteredCustBal.reduce((s, c) => s + c.totalPaid, 0))}</td>
                            <td className="px-4 py-3 text-right text-sm text-sky-600">{formatPrice(filteredCustBal.reduce((s, c) => s + c.totalOutstanding, 0))}</td>
                            <td className="hidden lg:table-cell" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Supplier Balance Tab ── */}
              {activeTab === 'supplier-bal' && (
                <div>
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <Info className="w-4 h-4 text-violet-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Rekap saldo sisa hutang per supplier — gabungan dari seluruh PO yang belum lunas</span>
                  </div>
                  {isLoading ? (
                    <div className="p-12 flex justify-center"><RefreshCw className="w-6 h-6 text-violet-400 animate-spin" /></div>
                  ) : filteredSuppBal.length === 0 ? (
                    <div className="p-12 text-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Semua hutang supplier telah lunas</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left px-5 py-3 font-semibold">Supplier</th>
                            <th className="text-center px-4 py-3 font-semibold">Jml PO</th>
                            <th className="text-right px-4 py-3 font-semibold">Total Hutang</th>
                            <th className="text-right px-4 py-3 font-semibold">Sudah Dibayar</th>
                            <th className="text-right px-4 py-3 font-semibold">Sisa Hutang</th>
                            <th className="px-4 py-3 hidden lg:table-cell w-36">Progres</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredSuppBal.map((s) => (
                            <tr key={s.supplierId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center shrink-0">
                                    <Building2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-900 dark:text-white">{s.supplierName}</div>
                                    {s.companyName && <div className="text-xs text-slate-400">{s.companyName}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-xs font-bold">{s.orderCount}</span>
                              </td>
                              <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-300">{formatPrice(s.totalBilled)}</td>
                              <td className="px-4 py-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatPrice(s.totalPaid)}</td>
                              <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white">{formatPrice(s.totalOutstanding)}</td>
                              <td className="px-4 py-4 hidden lg:table-cell">
                                <PaymentProgress paid={s.totalPaid} total={s.totalBilled} showLabel={false} />
                                <div className="text-[10px] text-slate-400 mt-1 text-right">{s.totalBilled > 0 ? Math.round((s.totalPaid / s.totalBilled) * 100) : 0}% lunas</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700 font-semibold">
                            <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-300">TOTAL ({filteredSuppBal.length} supplier)</td>
                            <td className="px-4 py-3 text-center text-sm">{filteredSuppBal.reduce((s, c) => s + c.orderCount, 0)}</td>
                            <td className="px-4 py-3 text-right text-sm">{formatPrice(filteredSuppBal.reduce((s, c) => s + c.totalBilled, 0))}</td>
                            <td className="px-4 py-3 text-right text-sm text-emerald-600">{formatPrice(filteredSuppBal.reduce((s, c) => s + c.totalPaid, 0))}</td>
                            <td className="px-4 py-3 text-right text-sm text-rose-600">{formatPrice(filteredSuppBal.reduce((s, c) => s + c.totalOutstanding, 0))}</td>
                            <td className="hidden lg:table-cell" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Aging Report Tab ── */}
              {activeTab === 'aging' && (
                <div className="p-5">
                  {/* Toggle AR/AP */}
                  <div className="flex items-center gap-2 mb-5">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Tampilkan:</span>
                    <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                      {(['ar', 'ap'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setAgingMode(mode)}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            agingMode === mode
                              ? 'bg-sky-600 text-white'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {mode === 'ar' ? 'Piutang (AR)' : 'Hutang (AP)'}
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const data = agingMode === 'ar' ? agingAR : agingAP;
                        if (!data) return;
                        const allItems = [
                          ...data.current.map((x: any) => ({ ...x, bucket: 'Current (0–30h)' })),
                          ...data.days30.map((x: any) => ({ ...x, bucket: '31–60h' })),
                          ...data.days60.map((x: any) => ({ ...x, bucket: '61–90h' })),
                          ...data.days90Plus.map((x: any) => ({ ...x, bucket: '>90h (Kritis)' })),
                        ];
                        exportToCSV(`aging_${agingMode}_${new Date().toISOString().split('T')[0]}`, allItems.map(x => ({
                          bucket: x.bucket,
                          ref: agingMode === 'ar' ? x.orderNumber : x.poNumber,
                          party: agingMode === 'ar' ? x.customer?.name : x.supplier?.name,
                          totalAmount: x.totalAmount,
                          paidAmount: x.paidAmount,
                          remainingBalance: x.remainingBalance,
                          daysSince: x.daysSince,
                          status: x.paymentStatus,
                        })), [
                          { key: 'bucket', label: 'Periode' },
                          { key: 'ref', label: 'No. Referensi' },
                          { key: 'party', label: agingMode === 'ar' ? 'Pelanggan' : 'Supplier' },
                          { key: 'totalAmount', label: 'Total' },
                          { key: 'paidAmount', label: 'Dibayar' },
                          { key: 'remainingBalance', label: 'Sisa' },
                          { key: 'daysSince', label: 'Hari Berlalu' },
                          { key: 'status', label: 'Status' },
                        ]);
                      }}
                      className="ml-auto gap-1.5 text-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Export Aging Report
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.print()}
                      className="gap-1.5 text-xs"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </Button>
                  </div>

                  {/* Summary totals per bucket */}
                  {currentAging && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                      {agingBuckets.map((b) => {
                        const total = (b.items || []).reduce((acc: number, x: any) => acc + (x.remainingBalance || 0), 0);
                        return (
                          <div key={b.key} className={`${b.light} border border-slate-200 dark:border-slate-800 rounded-xl p-4`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
                              <span className={`text-xs font-semibold ${b.text}`}>{b.label}</span>
                            </div>
                            <div className="text-lg font-bold text-slate-900 dark:text-white">{formatPrice(total)}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{(b.items || []).length} transaksi</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Aging Table */}
                  {agingBuckets.map((bucket) => (
                    <div key={bucket.key} className="mb-5 last:mb-0">
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${bucket.light} mb-2`}>
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${bucket.color}`} />
                        <span className={`text-sm font-bold ${bucket.text}`}>{bucket.label}</span>
                        <span className="text-xs text-slate-400 ml-1">({(bucket.items || []).length} item)</span>
                      </div>
                      {(bucket.items || []).length === 0 ? (
                        <div className="text-xs text-slate-400 dark:text-slate-500 px-3 py-2">Tidak ada transaksi</div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                                <th className="text-left px-4 py-2.5 font-semibold">Referensi</th>
                                <th className="text-left px-4 py-2.5 font-semibold">{agingMode === 'ar' ? 'Pelanggan' : 'Supplier'}</th>
                                <th className="text-right px-4 py-2.5 font-semibold">Total</th>
                                <th className="text-right px-4 py-2.5 font-semibold">Dibayar</th>
                                <th className="text-right px-4 py-2.5 font-semibold">Sisa</th>
                                <th className="text-center px-4 py-2.5 font-semibold">Umur</th>
                                <th className="text-center px-4 py-2.5 font-semibold">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {(bucket.items as any[]).map((item: any) => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                                    {agingMode === 'ar' ? item.orderNumber : item.poNumber}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                                    {agingMode === 'ar' ? (item.customer?.name || '-') : (item.supplier?.name || '-')}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatPrice(item.totalAmount)}</td>
                                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{formatPrice(item.paidAmount)}</td>
                                  <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{formatPrice(item.remainingBalance)}</td>
                                  <td className="px-4 py-3 text-center"><AgingBadge days={item.daysSince} /></td>
                                  <td className="px-4 py-3 text-center"><PaymentBadge status={item.paymentStatus} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Detail Modal ── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-start justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {selectedAR ? `Piutang: ${selectedAR.orderNumber}` : `Hutang: ${selectedAP?.poNumber}`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedAR ? (selectedAR.customer?.name || '-') : (selectedAP?.supplier?.name || '-')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className={`text-xs gap-1.5 ${selectedAR ? 'bg-sky-600 hover:bg-sky-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                onClick={(e) => openPayForm(e)}
                disabled={(selectedAR ? selectedAR.remainingBalance : selectedAP?.remainingBalance ?? 0) <= 0}
              >
                <Plus className="w-3 h-3" /> Catat Pembayaran
              </Button>
            </div>
          </div>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Tagihan', value: formatPrice(selectedAR?.totalAmount ?? selectedAP?.totalAmount ?? 0) },
                { label: 'Sudah Dibayar', value: formatPrice(selectedAR?.paidAmount ?? selectedAP?.paidAmount ?? 0), color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Sisa', value: formatPrice(selectedAR?.remainingBalance ?? selectedAP?.remainingBalance ?? 0), color: 'text-rose-600 dark:text-rose-400 font-bold' },
              ].map((c) => (
                <div key={c.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                  <div className={`text-base font-bold ${c.color || 'text-slate-900 dark:text-white'}`}>{c.value}</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <PaymentProgress
                paid={selectedAR?.paidAmount ?? selectedAP?.paidAmount ?? 0}
                total={selectedAR?.totalAmount ?? selectedAP?.totalAmount ?? 0}
              />
            </div>

            {/* Payment history */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Riwayat Pembayaran ({detailPayments.length})</h4>
              {isLoadingDetail ? (
                <div className="py-6 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-sky-400" /></div>
              ) : detailPayments.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-400">Belum ada pembayaran yang dicatat</div>
              ) : (
                <div className="space-y-2">
                  {detailPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">{p.referenceNumber}</div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">{p.method}</div>
                          {p.notes && <div className="text-xs text-slate-400 mt-0.5">{p.notes}</div>}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(p.amount)}</div>
                        <div className="text-[11px] text-slate-400">{new Date(p.paymentDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <button
                          className="text-[10px] text-sky-500 hover:text-sky-600 flex items-center gap-0.5 transition-colors"
                          onClick={() => printReceipt({
                            ...p,
                            partyName: selectedAR?.customer?.name ?? selectedAP?.supplier?.name ?? '-',
                            orderRef: selectedAR?.orderNumber ?? selectedAP?.poNumber ?? '-',
                            totalAmount: selectedAR?.totalAmount ?? selectedAP?.totalAmount ?? 0,
                          })}
                        >
                          <Printer className="w-3 h-3" /> Cetak Kuitansi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Payment Form Modal ── */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="max-w-md p-0 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {selectedAR ? '💰 Catat Pembayaran Piutang' : '💸 Catat Pembayaran Hutang'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sisa: <span className="font-bold text-slate-900 dark:text-white">{formatPrice(selectedAR?.remainingBalance ?? selectedAP?.remainingBalance ?? 0)}</span>
              {' · '}
              {selectedAR ? selectedAR.orderNumber : selectedAP?.poNumber}
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Jumlah Pembayaran (dalam USD base)*</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Contoh: 500"
                value={payForm.amount}
                onChange={(e) => setPayForm(p => ({ ...p, amount: e.target.value }))}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Metode Pembayaran</Label>
              <select
                value={payForm.method}
                onChange={(e) => setPayForm(p => ({ ...p, method: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 transition"
              >
                {['Bank Transfer', 'Cash', 'Cheque', 'Giro', 'Virtual Account', 'QRIS', 'Kartu Kredit'].map(m => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tanggal Pembayaran</Label>
              <Input
                type="date"
                value={payForm.paymentDate}
                onChange={(e) => setPayForm(p => ({ ...p, paymentDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Catatan (opsional)</Label>
              <Input
                placeholder="Mis: Termin ke-1, bukti transfer..."
                value={payForm.notes}
                onChange={(e) => setPayForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>

            {payError && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {payError}
              </div>
            )}
            {paySuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {paySuccess}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setIsPayOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button
                className={`flex-1 ${selectedAR ? 'bg-sky-600 hover:bg-sky-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                onClick={submitPayment}
                disabled={isSubmitting}
              >
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Pembayaran'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
