'use client';
import Sidebar from '@/components/ui/layout/sidebar';
import Topbar from '@/components/ui/layout/topbar';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  Receipt,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSales, createSalesOrder, getSalesMetrics, type SalesOrderItem } from '@/app/actions/sales';
import { useUser } from '@/hooks/useUser';
import { exportToCSV } from '@/lib/export';
import { formatPrice } from '@/lib/currency';
import InvoiceModal, { type InvoiceData } from '@/components/ui/InvoiceModal';
import { FileSpreadsheet, Printer } from 'lucide-react';

// ─── Badge styles ───────────────────────────────────────────────────────────────
const badgeClasses: Record<string, string> = {
  Paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800',
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-200 dark:border-amber-800',
  Overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 border border-red-200 dark:border-red-800',
  Processing: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200 border border-sky-200 dark:border-sky-800',
  Shipping: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200 border border-violet-200 dark:border-violet-800',
  Delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800',
  Confirmed: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200 border border-sky-200 dark:border-sky-800',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800',
  Cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  Quotation: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800',
};

// ─── Default form state ─────────────────────────────────────────────────────────
const defaultForm = {
  order: '',
  customer: '',
  salesperson: '',
  date: new Date().toISOString().split('T')[0],
  total: '',
  payment: 'Paid',
  status: 'Processing',
  delivery: 'Shipping',
};

// ─── Component ──────────────────────────────────────────────────────────────────
const SalesPage = () => {
  const user = useUser();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Data state
  const [salesList, setSalesList] = useState<SalesOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setMetrics] = useState({
    totalRevenue: '$0',
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    avgOrderValue: '$0',
  });

  // Modal / form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(defaultForm);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOrder, setFilterOrder] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterSalesperson, setFilterSalesperson] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ─── Load data ────────────────────────────────────────────────────────────────
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, metricsRes] = await Promise.all([
        getSales(),
        getSalesMetrics(),
      ]);

      if (salesRes.success) {
        setSalesList(salesRes.data);
      }

      if (metricsRes.success && metricsRes.data) {
        const d = metricsRes.data;
        setSalesList(prev => {
          // Use DB count
          return prev;
        });
        setMetrics({
          totalRevenue: `$${Number(d.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
          totalOrders: d.totalOrders,
          completedOrders: d.completedOrders,
          pendingOrders: d.totalOrders - d.completedOrders,
          avgOrderValue: `$${Number(d.averageOrderValue).toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
        });
      }
    } catch (e) {
      console.error('loadData error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    const handleCurrencyChange = () => loadData();
    window.addEventListener("currency_change", handleCurrencyChange);
    return () => window.removeEventListener("currency_change", handleCurrencyChange);
  }, []);

  // Recompute metrics from live list when metrics endpoint might be unavailable
  const dynamicKpiCards = useMemo(() => {
    const totalRev = salesList.reduce((acc, s) => {
      return acc + (Number(String(s.total || '0').replace(/[^0-9.-]+/g, '')) || 0);
    }, 0);
    const ordersCount = salesList.length;
    const paidCount = salesList.filter(s => s.payment === 'Paid').length;
    const pendingCount = salesList.filter(s => s.payment === 'Pending' || s.payment === 'Overdue').length;
    const completedCount = salesList.filter(s => s.status === 'Completed').length;
    const avgVal = ordersCount > 0 ? Math.round(totalRev / ordersCount) : 0;

    return [
      {
        title: 'Total Revenue',
        value: formatPrice(totalRev),
        change: ordersCount > 0 ? `${ordersCount} orders` : null,
        changeClass: 'text-emerald-500',
        icon: DollarSign,
        iconClass: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
      },
      {
        title: 'Sales Orders',
        value: ordersCount.toLocaleString(),
        change: null,
        icon: ShoppingCart,
        iconClass: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
      },
      {
        title: 'Paid Invoices',
        value: paidCount.toLocaleString(),
        change: null,
        icon: Receipt,
        iconClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
      },
      {
        title: 'Pending / Overdue',
        value: pendingCount.toLocaleString(),
        change: null,
        icon: Clock3,
        iconClass: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
      },
      {
        title: 'Completed Orders',
        value: completedCount.toLocaleString(),
        change: null,
        icon: CheckCircle2,
        iconClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
      },
      {
        title: 'Avg Order Value',
        value: formatPrice(avgVal),
        change: null,
        icon: TrendingUp,
        iconClass: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
      },
    ];
  }, [salesList]);

  // ─── Filters ──────────────────────────────────────────────────────────────────
  const filteredList = useMemo(() => {
    return salesList.filter(row => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || (
        row.order?.toLowerCase().includes(q) ||
        row.customer?.toLowerCase().includes(q) ||
        row.salesperson?.toLowerCase().includes(q)
      );
      const matchOrder = !filterOrder || row.order?.toLowerCase().includes(filterOrder.toLowerCase());
      const matchCustomer = !filterCustomer || row.customer?.toLowerCase().includes(filterCustomer.toLowerCase());
      const matchSalesperson = !filterSalesperson || row.salesperson?.toLowerCase().includes(filterSalesperson.toLowerCase());
      const matchStatus = !filterStatus || (
        row.status?.toLowerCase().includes(filterStatus.toLowerCase()) ||
        row.payment?.toLowerCase().includes(filterStatus.toLowerCase())
      );
      return matchSearch && matchOrder && matchCustomer && matchSalesperson && matchStatus;
    });
  }, [salesList, searchQuery, filterOrder, filterCustomer, filterSalesperson, filterStatus]);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const handleExportExcel = () => {
    exportToCSV('sales_orders', filteredList, [
      { key: 'order', label: 'Order Number' },
      { key: 'customer', label: 'Customer Name' },
      { key: 'salesperson', label: 'Salesperson' },
      { key: 'date', label: 'Order Date' },
      { key: 'total', label: 'Total Amount' },
      { key: 'payment', label: 'Payment Status' },
      { key: 'status', label: 'Order Status' },
      { key: 'delivery', label: 'Delivery Status' },
    ]);
  };

  const handleOpenInvoice = (row: SalesOrderItem) => {
    const rawVal = Number(String(row.total || 0).replace(/[^0-9.-]+/g, '')) || 0;
    const subtotal = Math.round(rawVal / 1.1);
    const tax = rawVal - subtotal;

    setSelectedInvoice({
      orderNumber: row.order || 'SO-1001',
      date: row.date || new Date().toLocaleDateString('en-GB'),
      type: 'SALES',
      partyName: row.customer || 'Walk-in Customer',
      partyCompany: 'Client Account',
      paymentStatus: row.payment || 'Paid',
      items: [
        {
          name: `Sales Order Items (${row.order})`,
          quantity: row.items || 1,
          unitPrice: subtotal,
          subtotal: subtotal,
        },
      ],
      subtotal,
      tax,
      total: rawVal,
      companyName: 'FlowERP Store',
    });
    setIsInvoiceOpen(true);
  };

  // ─── Form handlers ────────────────────────────────────────────────────────────
  const autoGenerateOrder = () => {
    const num = Math.floor(10000 + Math.random() * 90000);
    setFormData(prev => ({ ...prev, order: `SO-${num}` }));
  };

  const resetForm = () => {
    setFormData(defaultForm);
    setFormError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.customer.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    if (!formData.total || Number(formData.total) <= 0) {
      setFormError('Total amount must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createSalesOrder({
        orderNumber: formData.order,
        customerName: formData.customer.trim(),
        salesperson: formData.salesperson || user.name,
        orderDate: formData.date,
        totalAmount: Number(formData.total),
        paymentStatus: formData.payment,
        status: formData.status,
        deliveryStatus: formData.delivery,
      });

      if (res.success) {
        setIsAddModalOpen(false);
        resetForm();
        // Reload fresh data from server
        await loadData();
      } else {
        setFormError(res.error || 'Failed to save sales order. Please try again.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unexpected error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/Login');
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={`flex h-screen w-full transition-colors duration-200 ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Top Navigation */}
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDark={isDark}
          setIsDark={setIsDark}
          onRefresh={loadData}
          isLoading={isLoading}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search orders, customers..."
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-7xl mx-auto px-6 py-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Sales Management</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Manage quotations, sales orders, invoices, and customer transactions.
                  {salesList.length > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold dark:bg-sky-950 dark:text-sky-300">
                      {salesList.length} sales order{salesList.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Export Excel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    autoGenerateOrder();
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 cursor-pointer shadow-lg shadow-sky-500/20"
                >
                  Create Sales Order
                </button>
              </div>
            </div>

            {/* KPI Cards — real data */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dynamicKpiCards.map(card => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.title}</p>
                        <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{card.value}</p>
                      </div>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    {card.change && <p className={`mt-4 text-sm font-medium ${card.changeClass}`}>{card.change}</p>}
                  </div>
                );
              })}
            </div>

            {/* Filter Section */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Filter Orders</h2>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterOrder('');
                    setFilterCustomer('');
                    setFilterSalesperson('');
                    setFilterStatus('');
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  placeholder="Search Order No..."
                  value={filterOrder}
                  onChange={e => setFilterOrder(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <input
                  placeholder="Customer Name..."
                  value={filterCustomer}
                  onChange={e => setFilterCustomer(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <input
                  placeholder="Salesperson..."
                  value={filterSalesperson}
                  onChange={e => setFilterSalesperson(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <input
                  placeholder="Status / Payment..."
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </section>

            {/* Sales Table — real DB data */}
            <section className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Order</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Salesperson</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Delivery</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                          Loading sales orders...
                        </td>
                      </tr>
                    ) : filteredList.length > 0 ? (
                      filteredList.map((row, idx) => (
                        <tr key={row.dbId || row.order || `row-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-sky-600 dark:text-sky-400">{row.order || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-900 dark:text-white font-medium">{row.customer || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{row.salesperson || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{row.date || '-'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{row.total || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClasses[row.payment || ''] || 'bg-slate-100 text-slate-700'}`}>
                              {row.payment || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClasses[row.status || ''] || 'bg-slate-100 text-slate-700'}`}>
                              {row.status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClasses[row.delivery || ''] || 'bg-slate-100 text-slate-700'}`}>
                              {row.delivery || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenInvoice(row)}
                              title="Print Invoice / View PDF"
                              className="inline-flex h-8 px-2.5 items-center justify-center gap-1 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300 dark:hover:bg-sky-900 transition-colors text-xs font-medium cursor-pointer"
                            >
                              <Printer className="h-3.5 w-3.5" /> Invoice
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center">
                          <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No sales orders found</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {searchQuery || filterOrder || filterCustomer || filterSalesperson || filterStatus
                              ? 'Try adjusting your filters'
                              : 'Create your first sales order using the button above'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>
                  Showing <strong>{filteredList.length}</strong> of <strong>{salesList.length}</strong> orders
                </span>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900 transition-colors">Previous</button>
                  <button className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900 transition-colors">Next</button>
                </div>
              </div>
            </section>

            {/* Recent Sales Summary (live) */}
            {salesList.length > 0 && (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Recent Sales Activity</h2>
                <div className="space-y-3">
                  {salesList.slice(0, 5).map((s, i) => (
                    <div key={s.dbId || i} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.order}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{s.customer} · {s.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.total}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClasses[s.payment || ''] || ''}`}>
                          {s.payment}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </div>

      {/* CREATE SALES ORDER MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          {/* Header */}
          <div className="bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Create Sales Order</h2>
                <p className="mt-0.5 text-xs text-sky-100 opacity-90">Record a new sales transaction</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-6 space-y-4">
            {/* Order & Customer */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Order No.
                  </Label>
                  <button
                    type="button"
                    onClick={autoGenerateOrder}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer"
                  >
                    Auto Generate
                  </button>
                </div>
                <Input
                  placeholder="e.g. SO-10025"
                  value={formData.order}
                  onChange={e => setFormData(prev => ({ ...prev, order: e.target.value }))}
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                />
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Customer <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. PT Nusantara Digital"
                  value={formData.customer}
                  onChange={e => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                  required
                />
              </div>
            </div>

            {/* Salesperson & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Salesperson
                </Label>
                <Input
                  placeholder="e.g. Arkan Farrel"
                  value={formData.salesperson}
                  onChange={e => setFormData(prev => ({ ...prev, salesperson: e.target.value }))}
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                />
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                  required
                />
              </div>
            </div>

            {/* Total */}
            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Total Amount ($) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.total}
                onChange={e => setFormData(prev => ({ ...prev, total: e.target.value }))}
                disabled={isSubmitting}
                className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                required
              />
            </div>

            {/* Payment, Status, Delivery */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Payment</Label>
                <Select value={formData.payment} onValueChange={val => setFormData(prev => ({ ...prev, payment: val || prev.payment }))} disabled={isSubmitting}>
                  <SelectTrigger className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Status</Label>
                <Select value={formData.status} onValueChange={val => setFormData(prev => ({ ...prev, status: val || prev.status }))} disabled={isSubmitting}>
                  <SelectTrigger className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quotation">Quotation</SelectItem>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Delivery</Label>
                <Select value={formData.delivery} onValueChange={val => setFormData(prev => ({ ...prev, delivery: val || prev.delivery }))} disabled={isSubmitting}>
                  <SelectTrigger className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Shipping">Shipping</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Error */}
            {formError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400">
                {formError}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                disabled={isSubmitting}
                className="flex-1 rounded-2xl border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-sky-600 text-white hover:bg-sky-700"
              >
                {isSubmitting ? 'Saving...' : 'Save Order'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PRINTABLE INVOICE MODAL */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
};

export default SalesPage;