'use client';
import Sidebar from '@/components/ui/layout/sidebar';
import Topbar from '@/components/ui/layout/topbar';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from "next/navigation";
import {
  BarChart3,
  ShoppingCart,
  Package,
  Users,
  FileText,
  FileSpreadsheet,
  Search,
  Filter,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
} from 'lucide-react';

import { getReportsData } from '@/app/actions/reports';
import { getExpenses, createExpense, deleteExpense, getProfitAndLossStatement } from '@/app/actions/expenses';
import { exportToCSV } from '@/lib/export';
import { formatPrice } from '@/lib/currency';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PlusCircle, Wallet, TrendingDown, Trash2 } from 'lucide-react';

export default function ReportsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalRevenue: '$0.00',
    totalSales: '0',
    inventoryValue: '$0.00',
    activeCustomers: '0',
  });

  // State P&L (Profit & Loss) & Expenses
  const [pnl, setPnl] = useState<{
    grossRevenue: number;
    cogs: number;
    totalPurchases: number;
    grossProfit: number;
    totalOperationalExpenses: number;
    netProfit: number;
    netProfitMargin: number;
  }>({
    grossRevenue: 0,
    cogs: 0,
    totalPurchases: 0,
    grossProfit: 0,
    totalOperationalExpenses: 0,
    netProfit: 0,
    netProfitMargin: 0,
  });

  const [expenses, setExpenses] = useState<Array<{ id: string; title: string; category: string; amount: number; date: string; notes?: string }>>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Operational');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [inventoryMetrics, setInventoryMetrics] = useState<Array<{ label: string; value: string; trend: string; positive: boolean }>>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<Array<{ month: string; revenue: number; percentage: number }>>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<Array<{ label: string; value: string; color: string }>>([]);
  const [salesRegions] = useState<Array<{ name: string; revenue: string; orders: number; growth: string; progress: number }>>([]);
  const [topProducts, setTopProducts] = useState<Array<{ name: string; sku: string; category: string; units: number; revenue: string; growth: string }>>([]);
  const [recentReports, setRecentReports] = useState<Array<{ title: string; time: string }>>([]);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, pnlRes, expRes] = await Promise.all([
        getReportsData(),
        getProfitAndLossStatement(),
        getExpenses(),
      ]);

      if (res && res.success) {
        if (res.summary) setSummaryMetrics(res.summary);
        if (res.inventoryMetrics) setInventoryMetrics(res.inventoryMetrics);
        if (res.monthlyTrendData) setMonthlyTrend(res.monthlyTrendData);
        if (res.paymentBreakdown) setPaymentBreakdown(res.paymentBreakdown);
        if (res.topProducts) setTopProducts(res.topProducts);
        if (res.recentReports) setRecentReports(res.recentReports);
      }

      if (pnlRes && pnlRes.success && pnlRes.statement) {
        setPnl(pnlRes.statement);
      }

      if (expRes && expRes.success && expRes.expenses) {
        setExpenses(expRes.expenses);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReports();
    const handleCurrencyChange = () => fetchReports();
    window.addEventListener("currency_change", handleCurrencyChange);
    return () => window.removeEventListener("currency_change", handleCurrencyChange);
  }, [fetchReports]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/Login");
  };

  const summaryCards = [
    {
      icon: BarChart3,
      title: 'Total Revenue',
      value: formatPrice(summaryMetrics.totalRevenue),
      subtitle: 'Real-time Total Sales',
    },
    {
      icon: ShoppingCart,
      title: 'Total Sales',
      value: summaryMetrics.totalSales,
      subtitle: 'Orders Completed',
    },
    {
      icon: Package,
      title: 'Inventory Value',
      value: formatPrice(summaryMetrics.inventoryValue),
      subtitle: 'Current Stock Valuation',
    },
    {
      icon: Users,
      title: 'Active Customers',
      value: summaryMetrics.activeCustomers,
      subtitle: 'Registered Customers',
    },
  ];

  const handleExportExcel = () => {
    if (topProducts.length > 0) {
      exportToCSV('top_selling_products_report', topProducts, [
        { key: 'name', label: 'Product Name' },
        { key: 'sku', label: 'SKU' },
        { key: 'category', label: 'Category' },
        { key: 'units', label: 'Units Sold' },
        { key: 'revenue', label: 'Revenue' },
        { key: 'growth', label: 'Growth' },
      ]);
    } else {
      exportToCSV('financial_summary_report', [
        {
          Metric: 'Total Revenue',
          Value: summaryMetrics.totalRevenue,
        },
        {
          Metric: 'Total Sales Orders',
          Value: summaryMetrics.totalSales,
        },
        {
          Metric: 'Total Inventory Valuation',
          Value: summaryMetrics.inventoryValue,
        },
        {
          Metric: 'Active Customers',
          Value: summaryMetrics.activeCustomers,
        },
      ]);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className={`flex h-screen bg-gray-50 ${isDark ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
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
          onRefresh={fetchReports}
          isLoading={isLoading}
          searchPlaceholder="Search reports..."
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
            {/* PRINT ONLY DOCUMENT HEADER */}
            <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-sm">
                    F
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">FlowERP Store</h2>
                    <p className="text-xs text-slate-500">Official Financial & Executive Performance Report</p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p className="font-semibold text-slate-900">CONFIDENTIAL</p>
                  <p suppressHydrationWarning>Generated: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reports</h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  View business performance, financial insights, and operational analytics.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row print:hidden">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-semibold  text-slate-700 transition-all duration-200 hover:bg-slate-50 cursor-pointer shadow-sm"
                >
                  <PlusCircle className="h-4 w-4" /> Record Expense
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Export Excel
                </button>
                <button
                  type="button"
                  onClick={handlePrintPDF}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-sky-700 hover:shadow-lg cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Export PDF
                </button>
              </div>
            </div>

            {/* FINANCIAL PROFIT & LOSS STATEMENT (LABA RUGI BERSIH) SECTION */}
            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-sky-600" /> Profit & Loss Statement (Laporan Laba Rugi Bersih)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Real-time net profit calculation across gross revenue, product COGS, and operational expenses.
                  </p>
                </div>
                <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold ${pnl.netProfit >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                  Net Margin: {pnl.netProfitMargin}%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Gross Sales Revenue</span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">${pnl.grossRevenue.toLocaleString()}</div>
                  <span className="text-[11px] text-emerald-600 font-medium">Total Omzet Penjualan</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Cost of Goods Sold (COGS)</span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">${pnl.cogs.toLocaleString()}</div>
                  <span className="text-[11px] text-slate-500 font-medium">Modal HPP Produk Terjual</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Operational Expenses</span>
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">${pnl.totalOperationalExpenses.toLocaleString()}</div>
                  <span className="text-[11px] text-slate-500 font-medium">Sewa, Gaji, Listrik, Logistic</span>
                </div>

                <div className={`p-4 rounded-xl border ${pnl.netProfit >= 0 ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800' : 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'}`}>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Net Profit / (Loss)</span>
                  <div className={`text-2xl font-black mt-1 ${pnl.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                    ${pnl.netProfit.toLocaleString()}
                  </div>
                  <span className="text-[11px] font-semibold">Keuntungan Bersih / Rugi</span>
                </div>
              </div>

              {/* OPERATIONAL EXPENSES LOG TABLE */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-rose-500" /> Operational Expenses Record
                  </h4>
                  <span className="text-xs text-slate-500">{expenses.length} Records</span>
                </div>

                {expenses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Expense Title</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3 text-right print:hidden">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {expenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 text-slate-500">{exp.date}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{exp.title}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300">
                                {exp.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-rose-600 dark:text-rose-400">-${exp.amount.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right print:hidden">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Hapus catatan pengeluaran "${exp.title}"?`)) {
                                    await deleteExpense(exp.id);
                                    fetchReports();
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-600 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-3 italic">Belum ada pengeluaran operasional yang dicatat. Klik &quot;+ Record Expense&quot; untuk menambahkan.</p>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{card.title}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.subtitle}</p>
                      </div>
                      <Icon className="h-8 w-8 text-sky-600 opacity-80" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Report Filters */}
            <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 print:hidden">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Report Type</label>
                  <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 hover:border-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                    <option>All Reports</option>
                    <option>Sales</option>
                    <option>Inventory</option>
                    <option>Financial</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Date Range</label>
                  <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 hover:border-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                    <option>Last 30 Days</option>
                    <option>Last 90 Days</option>
                    <option>Last Year</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Department</label>
                  <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 hover:border-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                    <option>All Departments</option>
                    <option>Sales</option>
                    <option>Operations</option>
                    <option>Finance</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status</label>
                  <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 hover:border-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Archived</option>
                  </select>
                </div>
                <button className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Search</span>
                </button>
                <button className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
              </div>
            </div>

            {/* Business Overview */}
            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Revenue Trend */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Revenue Trend (Last 6 Months)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time monthly revenue breakdown calculated from sales database</p>
                </div>
                <div className="flex h-48 items-end justify-between gap-3 pt-6">
                  {monthlyTrend.length > 0 ? (
                    monthlyTrend.map((item, idx) => (
                      <div key={idx} className="flex flex-1 flex-col items-center gap-2 h-full justify-end group">
                        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1 whitespace-nowrap">
                          {formatPrice(item.revenue)}
                        </span>
                        <div
                          className="w-full rounded-t-lg bg-linear-to-t from-sky-600 to-sky-400 transition-all duration-500 hover:brightness-110 shadow-xs cursor-pointer"
                          style={{ height: `${Math.max(item.percentage, 10)}%` }}
                          title={`${item.month}: ${formatPrice(item.revenue)}`}
                        ></div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {item.month}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                      No monthly revenue data available.
                    </div>
                  )}
                </div>
              </div>

              {/* Sales Payment Breakdown */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Sales Payment Breakdown</h3>
                <div className="flex items-center justify-between">
                  <div className="flex h-40 w-40 items-center justify-center">
                    <svg viewBox="0 0 100 100" className="h-full w-full">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="25" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="25"
                        strokeDasharray="180 251.2"
                        className="transition-all duration-500"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-3">
                    {paymentBreakdown.length > 0 ? (
                      paymentBreakdown.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{item.value}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Belum ada data status pembayaran.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Performance */}
            <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white">Top Sales Regions</h3>
              <div className="space-y-6">
                {salesRegions && salesRegions.length > 0 ? (
                  salesRegions.map((region, idx) => (
                    <div key={idx} className="border-b border-slate-200 pb-6 last:border-b-0 dark:border-slate-700">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-semibold text-slate-900 dark:text-white">{region.name}</h4>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-sky-600">{region.revenue}</span>
                          <span className="flex items-center gap-1 text-sm font-semibold text-green-600">
                            <ArrowUpRight className="h-4 w-4" />
                            {region.growth}
                          </span>
                        </div>
                      </div>
                      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">{region.orders} orders</p>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-sky-500 to-sky-600 transition-all duration-500"
                          style={{ width: `${region.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Belum ada data wilayah penjualan di database.</p>
                )}
              </div>
            </div>

            {/* Inventory Summary */}
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {inventoryMetrics.map((metric, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{metric.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{metric.value}</p>
                  <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${metric.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {metric.trend}
                  </div>
                </div>
              ))}
            </div>

            {/* Top Selling Products */}
            <div className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-slate-200 p-6 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Top Selling Products</h3>
              </div>

              {/* Desktop Table */}
              <div className="hidden print:block md:block overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Product</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">SKU</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Category</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">Units Sold</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">Revenue</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, idx) => (
                      <tr key={idx} className="border-b border-slate-200 transition-all duration-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{product.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{product.sku}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{product.category}</td>
                        <td className="px-6 py-4 text-right text-sm text-slate-900 dark:text-white">{product.units}</td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">{product.revenue}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${product.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                            {product.growth.startsWith('+') ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {product.growth}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-4 p-6 md:hidden">
                {topProducts.map((product, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{product.name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{product.sku}</p>
                      </div>
                      <span className={`text-xs font-semibold ${product.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {product.growth}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Category</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{product.category}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Units</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{product.units}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Revenue</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{product.revenue}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Reports */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 print:hidden">
              <h3 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white">Recent Reports</h3>
              <div className="space-y-6">
                {recentReports.length > 0 ? (
                  recentReports.map((report, idx) => (
                    <div key={idx} className="flex items-center gap-4 border-l-2 border-sky-600 py-2 pl-4">
                      <FileText className="h-5 w-5 shrink-0 text-sky-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white">{report.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                          <Clock className="h-3 w-3" />
                          {report.time}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Belum ada riwayat laporan di database.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL RECORD EXPENSE DIALOG */}
        <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600" /> Record Operational Expense
              </h3>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!expenseTitle || !expenseAmount) {
                  alert('Judul & Jumlah Pengeluaran wajib diisi.');
                  return;
                }

                setIsSubmittingExpense(true);
                try {
                  const res = await createExpense({
                    title: expenseTitle,
                    category: expenseCategory,
                    amount: Number(expenseAmount),
                    notes: expenseNotes,
                  });

                  if (res && res.success) {
                    setIsExpenseModalOpen(false);
                    setExpenseTitle('');
                    setExpenseAmount('');
                    setExpenseNotes('');
                    fetchReports();
                  } else {
                    alert(res?.error || 'Gagal menyimpan pengeluaran.');
                  }
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : String(err);
                  alert(`Error saat simpan pengeluaran: ${msg}`);
                } finally {
                  setIsSubmittingExpense(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Expense Title *</Label>
                <Input
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g. Sewa Toko Bulanan / Bayar Listrik"
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Expense Category</Label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="Operational">Operational (Operasional Harian)</option>
                  <option value="Salary">Salary (Gaji Karyawan)</option>
                  <option value="Rent">Rent (Sewa Bangunan/Gudang)</option>
                  <option value="Utilities">Utilities (Listrik, Air, Internet)</option>
                  <option value="Logistics">Logistics (Biaya Pengiriman/Ongkir)</option>
                  <option value="Marketing">Marketing & Advertising</option>
                  <option value="Maintenance">Maintenance & Repair</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Amount ($) *</Label>
                <Input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Notes / Details</Label>
                <textarea
                  rows={2}
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Catatan tambahan..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                >
                  {isSubmittingExpense ? 'Saving...' : 'Save Expense'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}