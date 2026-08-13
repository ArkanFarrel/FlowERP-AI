'use client';

import Sidebar from '@/components/ui/layout/sidebar';
import Topbar from '@/components/ui/layout/topbar';
import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  DollarSign,
  Truck,
  CheckCircle,
  PlusCircle,
  PackageCheck,
  Users,
  Download,
  Search,
  Clock,
  Building2,
  Trash2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';

import { getPurchases, createPurchase, getPurchaseFormData, updatePurchaseStatus } from '@/app/actions/purchases';
import { exportToCSV } from '@/lib/export';
import InvoiceModal, { type InvoiceData } from '@/components/ui/InvoiceModal';
import { FileSpreadsheet, Printer } from 'lucide-react';
import { getSuppliers } from '@/app/actions/suppliers';
import { formatPrice } from '@/lib/currency';

interface PurchaseOrderItem {
  id: string;
  poNumber?: string;
  supplier: string;
  orderDate: string;
  deliveryDate?: string;
  expectedDelivery?: string;
  items: number | string;
  totalUnits?: number;
  rawItems?: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
  total?: string;
  totalAmount?: string;
  paymentStatus?: string;
  status: string;
}

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [purchasesList, setPurchasesList] = useState<PurchaseOrderItem[]>([]);
  const [realStats, setRealStats] = useState({
    totalOrders: 0,
    totalValue: '$0.00',
    pendingDeliveries: 0,
    completedOrders: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuppliers, setFormSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [formProducts, setFormProducts] = useState<Array<{ id: string; name: string; costPrice: number; stock: number }>>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'Ordered' | 'Processing' | 'Shipping' | 'Delivered'>('Ordered');
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantity: number; unitCost: number }>>([
    { productId: '', quantity: 1, unitCost: 0 },
  ]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const handleExportExcel = () => {
    exportToCSV('purchase_orders', purchasesList, [
      { key: 'id', label: 'PO Number' },
      { key: 'supplier', label: 'Supplier Name' },
      { key: 'orderDate', label: 'Order Date' },
      { key: 'expectedDelivery', label: 'Expected Delivery' },
      { key: 'totalAmount', label: 'Total Amount' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'status', label: 'Order Status' },
    ]);
  };

  const handleOpenInvoice = (po: PurchaseOrderItem) => {
    const rawVal = parseFloat((po.totalAmount || "0").replace(/[^0-9.-]+/g, "")) || 0;
    const subtotal = Math.round(rawVal / 1.1);
    const tax = rawVal - subtotal;

    const invoiceItems = po.rawItems && po.rawItems.length > 0
      ? po.rawItems.map(item => ({
          name: `${item.name} (${item.sku})`,
          quantity: item.quantity,
          unitPrice: item.unitCost,
          subtotal: item.totalCost,
        }))
      : [
          {
            name: `Purchase Order Procurement (${po.supplier})`,
            quantity: po.totalUnits || (typeof po.items === 'number' ? po.items : 1),
            unitPrice: subtotal,
            subtotal: subtotal,
          },
        ];

    setSelectedInvoice({
      orderNumber: po.id.startsWith('PO-') ? po.id : `PO-${po.id}`,
      date: po.orderDate || new Date().toLocaleDateString('en-GB'),
      type: 'PURCHASE',
      partyName: po.supplier || 'Vendor Supplier',
      partyCompany: 'Vendor Account',
      paymentStatus: po.paymentStatus || 'Paid',
      items: invoiceItems,
      subtotal: rawVal,
      tax: 0,
      total: rawVal,
      companyName: 'FlowERP Store',
    });
    setIsInvoiceOpen(true);
  };

  const router = useRouter();

  const fetchPurchases = () => {
    setIsLoading(true);
    getPurchases()
      .then((res) => {
        if (res.success && res.data) {
          setPurchasesList(res.data as unknown as PurchaseOrderItem[]);
        }
        if (res.stats) {
          setRealStats(res.stats);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPurchases();
  }, []);

  const handleOpenAddModal = async () => {
    setIsAddModalOpen(true);
    let suppliersList: Array<{ id: string; name: string }> = [];
    let productsList: Array<{ id: string; name: string; costPrice: number; stock: number }> = [];

    try {
      const supRes = await getSuppliers();
      if (supRes && supRes.success && Array.isArray(supRes.data) && supRes.data.length > 0) {
        suppliersList = supRes.data.map((s: { id?: string | number; dbId?: string; name?: string; company?: string }) => ({
          id: String(s.dbId || s.id || ''),
          name: s.company && s.company !== s.name ? `${s.name || ''} (${s.company})` : (s.name || ''),
        }));
      }
    } catch {
      // ignore
    }

    const res = await getPurchaseFormData();
    if (res.success) {
      if (suppliersList.length === 0 && res.suppliers && res.suppliers.length > 0) {
        suppliersList = res.suppliers;
      }
      productsList = res.products;
    }

    setFormSuppliers(suppliersList);
    setFormProducts(productsList);
    if (suppliersList.length > 0) setSelectedSupplierId(suppliersList[0].id);
    else setSelectedSupplierId('');

    if (productsList.length > 0) {
      setOrderItems([{ productId: productsList[0].id, quantity: 10, unitCost: productsList[0].costPrice || 50 }]);
    }
  };

  const handleAddItem = () => {
    const defaultProduct = formProducts[0];
    setOrderItems((prev) => [
      ...prev,
      { productId: defaultProduct ? defaultProduct.id : '', quantity: 1, unitCost: defaultProduct ? defaultProduct.costPrice || 0 : 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'productId' | 'quantity' | 'unitCost', value: string | number) => {
    setOrderItems((prev) => {
      const next = [...prev];
      const current = { ...next[index] };
      if (field === 'productId') {
        current.productId = String(value);
        const prod = formProducts.find((p) => p.id === value);
        if (prod) current.unitCost = prod.costPrice || 0;
      } else if (field === 'quantity') {
        current.quantity = Math.max(1, Number(value) || 1);
      } else if (field === 'unitCost') {
        current.unitCost = Math.max(0, Number(value) || 0);
      }
      next[index] = current;
      return next;
    });
  };

  const handleCreatePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert("Silakan pilih Supplier!");
      return;
    }
    const validItems = orderItems.filter((it) => it.productId && it.quantity > 0);
    if (validItems.length === 0) {
      alert("Silakan tambah minimal 1 produk untuk PO!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createPurchase({
        supplierId: selectedSupplierId,
        status: selectedStatus,
        items: validItems,
      });

      if (res.success) {
        setIsAddModalOpen(false);
        fetchPurchases();
      } else {
        alert(res.error || "Gagal membuat Purchase Order");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat membuat Purchase Order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    return purchasesList.filter((item) => {
      const matchesSearch =
        (item.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.supplier || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === 'all' ||
        item.status?.toLowerCase() === filterStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [purchasesList, searchTerm, filterStatus]);

  const pipelineData = useMemo(() => {
    const total = purchasesList.length || 1;
    const orderedCount = purchasesList.filter((p) => p.status === 'Ordered').length;
    const processingCount = purchasesList.filter((p) => p.status === 'Processing').length;
    const shippingCount = purchasesList.filter((p) => p.status === 'Shipping').length;
    const deliveredCount = purchasesList.filter((p) => p.status === 'Delivered').length;

    return [
      { label: 'Ordered', count: orderedCount, percentage: Math.round((orderedCount / total) * 100) },
      { label: 'Processing', count: processingCount, percentage: Math.round((processingCount / total) * 100) },
      { label: 'Shipping', count: shippingCount, percentage: Math.round((shippingCount / total) * 100) },
      { label: 'Delivered', count: deliveredCount, percentage: Math.round((deliveredCount / total) * 100) },
    ];
  }, [purchasesList]);

  const recentPurchasesData = useMemo(() => {
    return purchasesList.slice(0, 4).map((po) => ({
      action: `PO #${po.id} - ${po.status}`,
      po: `Supplier: ${po.supplier}`,
      time: po.orderDate,
    }));
  }, [purchasesList]);

  const supplierSummaryData = useMemo(() => {
    const map = new Map<string, { count: number; value: number; lastPurchase: string }>();

    for (const po of purchasesList) {
      const sup = po.supplier || "Global Supplier";
      const val = parseFloat((po.totalAmount || "0").replace(/[^0-9.-]+/g, "")) || 0;
      const prev = map.get(sup) || { count: 0, value: 0, lastPurchase: po.orderDate };
      map.set(sup, {
        count: prev.count + 1,
        value: prev.value + val,
        lastPurchase: prev.lastPurchase || po.orderDate,
      });
    }

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      orders: `${data.count} Orders`,
      value: `$${data.value.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
      lastPurchase: data.lastPurchase,
      performance: data.count >= 5 ? 'Excellent' : data.count >= 2 ? 'Good' : 'Average',
    }));
  }, [purchasesList]);

  const monthlyPurchaseActivity = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result: Array<{ month: string; value: number; totalVal: number; percentage: number }> = [];

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const mName = monthNames[mIdx];

      const monthVal = purchasesList.reduce((acc, po) => {
        const rawDate = po.orderDate ? new Date(po.orderDate) : new Date();
        const pDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;
        if (pDate.getMonth() === mIdx && pDate.getFullYear() === yr) {
          const num = Number(String(po.totalAmount || po.total || 0).replace(/[^0-9.-]+/g, '')) || 0;
          return acc + num;
        }
        return acc;
      }, 0);

      result.push({ month: mName, value: monthVal, totalVal: monthVal, percentage: 0 });
    }

    const maxVal = Math.max(...result.map((m) => m.totalVal), 1);
    result.forEach((m) => {
      m.percentage = m.totalVal > 0 ? Math.min(100, Math.max(12, Math.round((m.totalVal / maxVal) * 100))) : 8;
    });

    return result;
  }, [purchasesList]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/Login");
  };

  const statCards = [
    {
      icon: ShoppingCart,
      title: 'Total Purchase Orders',
      value: String(realStats.totalOrders),
      subtitle: 'All Purchase Orders',
      color: 'bg-sky-50',
      iconColor: 'text-sky-600',
    },
    {
      icon: DollarSign,
      title: 'Total Purchase Value',
      value: realStats.totalValue,
      subtitle: 'Total PO Value',
      color: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      icon: Truck,
      title: 'Pending Deliveries',
      value: String(realStats.pendingDeliveries),
      subtitle: 'Awaiting Arrival',
      color: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      icon: CheckCircle,
      title: 'Completed Orders',
      value: String(realStats.completedOrders),
      subtitle: 'Successfully Received',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ];

  const quickActions = [
    {
      icon: PlusCircle,
      title: 'Create Purchase Order',
      description: 'New purchase order',
    },
    {
      icon: PackageCheck,
      title: 'Receive Goods',
      description: 'Confirm delivery',
    },
    {
      icon: Users,
      title: 'Supplier List',
      description: 'View suppliers',
    },
    {
      icon: Download,
      title: 'Export Purchases',
      description: 'Download data',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ordered':
        return 'bg-sky-100 text-sky-800';
      case 'Processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'Shipping':
        return 'bg-amber-100 text-amber-800';
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'Excellent':
        return 'bg-emerald-100 text-emerald-800';
      case 'Good':
        return 'bg-sky-100 text-sky-800';
      case 'Average':
        return 'bg-yellow-100 text-yellow-800';
      case 'Needs Review':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

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
          onRefresh={fetchPurchases}
          isLoading={isLoading}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search PO number, supplier..."
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Purchases</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage purchase orders, supplier transactions, and procurement activities.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Export Excel
                </button>

                <button
                  onClick={handleOpenAddModal}
                  className="w-full whitespace-nowrap rounded-lg bg-sky-600 px-6 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-sky-700 hover:shadow-lg sm:w-auto cursor-pointer"
                >
                  + Create Purchase Order
                </button>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <div className={`mb-4 inline-flex rounded-lg ${card.color} dark:bg-slate-800 p-3`}>
                      <Icon className={`h-6 w-6 ${card.iconColor}`} />
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-slate-400">{card.title}</h3>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{card.subtitle}</p>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button
                onClick={handleOpenAddModal}
                className="rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 text-left transition-all duration-200 hover:border-sky-300 hover:shadow-md hover:-translate-y-1 cursor-pointer"
              >
                <PlusCircle className="mb-3 h-6 w-6 text-sky-600" />
                <h4 className="font-medium text-gray-900 dark:text-white">Create Purchase Order</h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">New purchase order</p>
              </button>
              {quickActions.slice(1).map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    key={idx}
                    className="rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 text-left transition-all duration-200 hover:border-sky-300 hover:shadow-md hover:-translate-y-1 cursor-pointer"
                  >
                    <Icon className="mb-3 h-6 w-6 text-sky-600" />
                    <h4 className="font-medium text-gray-900 dark:text-white">{action.title}</h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{action.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Search & Filters */}
            <div className="mb-8 rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Search Purchase Order
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search PO number or supplier..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 py-2 pl-10 pr-4 text-sm outline-none transition-all duration-200 focus:border-sky-300 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-sky-100"
                    />
                  </div>
                </div>

                <div className="w-full sm:w-auto">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Supplier
                  </label>
                  <select
                    value={filterSupplier}
                    onChange={(e) => setFilterSupplier(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 px-4 py-2 text-sm outline-none transition-all duration-200 focus:border-sky-300 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-sky-100"
                  >
                    <option value="all">All Suppliers</option>
                    <option value="pt-sumber">PT Sumber Makmur</option>
                    <option value="cv-mitra">CV Mitra Jaya</option>
                    <option value="pt-dinamik">PT Dinamik Makmur</option>
                    <option value="cv-global">CV Global Supply</option>
                  </select>
                </div>

                <div className="w-full sm:w-auto">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 px-4 py-2 text-sm outline-none transition-all duration-200 focus:border-sky-300 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-sky-100"
                  >
                    <option value="all">All Status</option>
                    <option value="ordered">Ordered</option>
                    <option value="processing">Processing</option>
                    <option value="shipping">Shipping</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-slate-700">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Purchase Orders Table */}
            <div className="mb-8 rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase">
                        PO Number
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase">
                        Supplier
                      </th>
                      <th className="hidden px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase sm:table-cell">
                        Order Date
                      </th>
                      <th className="hidden px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase md:table-cell">
                        Expected Delivery
                      </th>
                      <th className="hidden px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase lg:table-cell">
                        Items
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase">
                        Total
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.length > 0 ? (
                      filteredPurchases.map((order, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-100 transition-colors duration-200 hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-sky-600">
                            {order.id}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{order.supplier}</td>
                          <td className="hidden px-6 py-4 text-sm text-gray-600 sm:table-cell">
                            {order.orderDate}
                          </td>
                          <td className="hidden px-6 py-4 text-sm text-gray-600 md:table-cell">
                            {order.expectedDelivery}
                          </td>
                          <td className="hidden px-6 py-4 text-sm text-gray-600 lg:table-cell">
                            {order.items}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {order.totalAmount}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                            {order.status !== "Delivered" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Konfirmasi penerimaan barang untuk ${order.id}? Stok produk akan otomatis bertambah ke katalog.`)) {
                                    setIsLoading(true);
                                    const res = await updatePurchaseStatus(order.id, "Delivered");
                                    if (res.success) {
                                      alert("Barang berhasil diterima! Stok produk telah bertambah otomatis.");
                                      fetchPurchases();
                                    } else {
                                      alert(res.error || "Gagal memperbarui status PO.");
                                      setIsLoading(false);
                                    }
                                  }
                                }}
                                title="Terima Barang & Tambah Stok"
                                className="inline-flex h-8 px-2.5 items-center justify-center gap-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-xs font-semibold cursor-pointer shadow-xs"
                              >
                                <PackageCheck className="h-3.5 w-3.5" /> Terima Barang
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenInvoice(order)}
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
                        <td colSpan={8} className="py-8 text-center text-sm text-gray-500">
                          Belum ada Purchase Order di database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase Status Overview */}
            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Purchase Pipeline */}
              <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-sm">
                <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Purchase Pipeline</h3>
                <div className="space-y-6">
                  {pipelineData.map((stage, idx) => (
                    <div key={idx}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{stage.label}</span>
                        <span className="text-gray-600 dark:text-slate-400">{stage.percentage}% ({stage.count})</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-sky-600 transition-all duration-300"
                          style={{ width: `${stage.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Purchase Trend */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Purchase Activity</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Real-time procurement expenditure calculated from purchase orders</p>
                </div>
                <div className="flex h-48 items-end justify-between gap-3 pt-6">
                  {monthlyPurchaseActivity.map((data, idx) => (
                    <div key={idx} className="flex flex-1 flex-col items-center gap-2 h-full justify-end group">
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1 whitespace-nowrap">
                        {formatPrice(data.totalVal)}
                      </span>
                      <div
                        className="w-full rounded-t-lg bg-linear-to-t from-sky-600 to-sky-400 transition-all duration-500 hover:brightness-110 shadow-xs cursor-pointer"
                        style={{ height: `${data.percentage}%` }}
                        title={`${data.month}: ${formatPrice(data.totalVal)}`}
                      ></div>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{data.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Purchases */}
            <div className="mb-8 rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Recent Purchases</h3>
              <div className="space-y-4">
                {recentPurchasesData.length > 0 ? (
                  recentPurchasesData.map((purchase, idx) => (
                    <div key={idx} className="flex items-start gap-4 border-l-2 border-sky-600 pl-4">
                      <div className="mt-1">
                        <Clock className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{purchase.action}</p>
                        <p className="text-sm text-gray-600 dark:text-slate-400">{purchase.po}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-slate-400">{purchase.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-slate-400">Belum ada aktivitas pembelian terbaru.</p>
                )}
              </div>
            </div>

            {/* Supplier Purchase Summary */}
            <div>
              <h3 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Supplier Purchase Summary</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {supplierSummaryData.length > 0 ? (
                  supplierSummaryData.map((supplier, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                    >
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950">
                        <Building2 className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{supplier.name}</h4>
                      <p className="mt-4 text-sm text-gray-600 dark:text-slate-400">{supplier.orders}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{supplier.value}</p>
                      <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
                        Last Purchase <span className="font-medium text-gray-700 dark:text-slate-200">{supplier.lastPurchase}</span>
                      </p>
                      <div className="mt-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPerformanceColor(
                            supplier.performance
                          )}`}
                        >
                          {supplier.performance}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-slate-400 col-span-4">Belum ada ringkasan supplier di database.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Purchase Order Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Create Purchase Order</h2>
              <p className="mt-0.5 text-xs text-sky-100 opacity-90">Record a new procurement order from supplier</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
            >
              Close
            </button>
          </div>
          <form onSubmit={handleCreatePurchaseSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  {formSuppliers.length > 0 ? (
                    formSuppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Belum ada Supplier (Tambah di Halaman Suppliers)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Initial Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as 'Ordered' | 'Processing' | 'Shipping' | 'Delivered')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="Ordered">Ordered</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipping">Shipping</option>
                  <option value="Delivered">Delivered (Increment Stock)</option>
                </select>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Purchase Order Items
                </label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs outline-none focus:border-sky-500"
                      >
                        <option value="">Select Product...</option>
                        {formProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.stock})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Cost"
                        value={item.unitCost}
                        onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="w-20 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                      ${(item.quantity * item.unitCost).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </div>
                    {orderItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Total Calculation */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Purchase Value:</span>
              <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
                ${orderItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </span>
            </div>

            <DialogFooter className="pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Save Purchase Order'}
              </button>
            </DialogFooter>
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
}