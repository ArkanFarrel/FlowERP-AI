'use client';
import Sidebar from '@/components/ui/layout/sidebar';
import Topbar from '@/components/ui/layout/topbar';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { exportToCSV } from '@/lib/export';
import { FileSpreadsheet } from 'lucide-react';
import {
  Users,
  Building2,
  CheckCircle,
  Clock,
  DollarSign,
  PlusCircle,
  ShoppingCart,
  TrendingUp,
  Download,
  Search,
  Filter,
  Mail,
  Phone,
  Package,
  MoreHorizontal,
  Calendar,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { useEffect } from 'react';
import { getSuppliers, createSupplier, deleteSupplier } from '@/app/actions/suppliers';
import { Dialog, DialogContent} from '@/components/ui/dialog';

interface SupplierItem {
  id: number | string;
  dbId?: string;
  name: string;
  company: string;
  category: string;
  phone: string;
  email: string;
  orders: number;
  purchase: string;
  status: string;
  rating?: number;
}

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [suppliersList, setSuppliersList] = useState<SupplierItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSup, setNewSup] = useState({
    name: '',
    company: '',
    category: 'Raw Material',
    email: '',
    phone: '',
    address: '',
    status: 'Active',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const router = useRouter();

  const fetchSuppliers = () => {
    setIsLoading(true);
    getSuppliers()
      .then((res) => {
        if (res.success && res.data) {
          setSuppliersList(res.data);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSuppliers();
  }, []);

  const handleAddSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await createSupplier(newSup);
    if (res.success) {
      const updated = await getSuppliers();
      if (updated.data) setSuppliersList(updated.data);
      setIsAddModalOpen(false);
      setNewSup({ name: '', company: '', category: 'Raw Material', email: '', phone: '', address: '', status: 'Active' });
    } else {
      alert(res.error || 'Failed to add supplier');
    }
    setIsSubmitting(false);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      const res = await deleteSupplier(id);
      if (res.success) {
        setSuppliersList((prev) => prev.filter((s) => s.dbId !== id));
      }
    }
  };

  const handleExportSuppliers = () => {
    if (suppliersList.length === 0) {
      alert('No supplier data to export.');
      return;
    }
    const headers = ['Name', 'Company', 'Category', 'Phone', 'Email', 'Orders', 'Status'];
    const rows = suppliersList.map((s) => [
      `"${s.name}"`,
      `"${s.company}"`,
      s.category,
      s.phone,
      s.email,
      s.orders,
      s.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `suppliers_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  React.useEffect(() => {
    // Mobile responsive check if needed
  }, []);

  // Supplier Statistics derived from real DB data
  const totalSuppliers = suppliersList.length;
  const activeSuppliers = suppliersList.filter((s) => s.status === 'Active').length;
  const pendingSuppliers = suppliersList.filter((s) => s.status === 'Pending').length;

  const statsCards = [
    {
      icon: Users,
      title: 'Total Suppliers',
      value: String(totalSuppliers),
      subtitle: 'Registered Suppliers',
    },
    {
      icon: CheckCircle,
      title: 'Active Suppliers',
      value: String(activeSuppliers),
      subtitle: 'Currently Active',
    },
    {
      icon: Clock,
      title: 'Pending Approval',
      value: String(pendingSuppliers),
      subtitle: 'Awaiting Verification',
    },
    {
      icon: DollarSign,
      title: 'Total Suppliers',
      value: isLoading ? '...' : `${totalSuppliers} Active`,
      subtitle: 'Supplier Network',
    },
  ];

  // Quick Actions
  const quickActions = [
    { icon: PlusCircle, title: 'Add Supplier', onAction: () => setIsAddModalOpen(true) },
    { icon: ShoppingCart, title: 'Create Purchase Order', onAction: () => router.push('/Purchases') },
    { icon: TrendingUp, title: 'Supplier Performance', onAction: () => setIsPerformanceModalOpen(true) },
    { icon: Download, title: 'Export Suppliers', onAction: handleExportSuppliers },
  ];

  // Supplier Categories derived from real DB data
  const categoryMap: Record<string, number> = {};
  suppliersList.forEach((s) => {
    const cat = s.category || 'General';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const dynamicCategories = Object.entries(categoryMap).map(([name, count], idx) => {
    const icons = [Package, Building2, Users, ShoppingCart];
    return { icon: icons[idx % icons.length], name, count };
  });

  // Recent Supplier Activities from real data (latest suppliers added)
  const recentActivities = suppliersList.slice(0, 4).map((s) => ({
    event: s.status === 'Pending' ? 'Awaiting approval' : 'Supplier registered',
    company: s.company || s.name,
    time: 'Recently',
  }));

  // Filtered suppliers
  const filteredSuppliers = suppliersList.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status.toLowerCase() === statusFilter.toLowerCase();
    const matchCategory = categoryFilter === 'all' || s.category.toLowerCase().includes(categoryFilter.toLowerCase());
    return matchSearch && matchStatus && matchCategory;
  });

  // Real-time Supplier Rating Calculations
  const averageRatingScore = useMemo(() => {
    if (suppliersList.length === 0) return '0.0';
    const ratings = suppliersList.map((s) => s.rating || (s.status === 'Active' ? 4.8 : 4.0));
    const sum = ratings.reduce((acc, r) => acc + r, 0);
    return (sum / ratings.length).toFixed(1);
  }, [suppliersList]);

  const ratingMetrics = useMemo(() => {
    const total = suppliersList.length;
    if (total === 0) {
      return [
        { label: 'Active Rate', value: 0 },
        { label: 'Fulfillment Rate', value: 0 },
        { label: 'Verified Accounts', value: 0 },
        { label: 'Reliability Index', value: 0 },
      ];
    }
    const activeCount = suppliersList.filter((s) => s.status === 'Active').length;
    const pendingCount = suppliersList.filter((s) => s.status === 'Pending').length;
    const activeRate = Math.round((activeCount / total) * 100);
    const fulfillmentRate = Math.round(((total - pendingCount) / total) * 100);
    const verifiedRate = Math.round((suppliersList.filter((s) => s.status !== 'Blocked').length / total) * 100);
    const reliabilityIndex = Math.min(100, Math.round(activeRate * 0.6 + fulfillmentRate * 0.4));

    return [
      { label: 'Active Rate', value: activeRate },
      { label: 'Fulfillment Rate', value: fulfillmentRate },
      { label: 'Verified Accounts', value: verifiedRate },
      { label: 'Reliability Index', value: reliabilityIndex },
    ];
  }, [suppliersList]);

  // Real-time Purchase Distribution Calculations
  const distributionData = useMemo(() => {
    const total = suppliersList.length;
    if (total === 0) return [];
    const colors = ['#0284C7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const bgClasses = ['bg-sky-600', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-pink-500'];

    let accumulatedOffset = 0;
    return dynamicCategories.map((cat, idx) => {
      const percentage = Math.round((cat.count / total) * 100);
      const dashLength = (percentage / 100) * 251.327;
      const offset = accumulatedOffset;
      accumulatedOffset += dashLength;

      return {
        name: cat.name,
        count: cat.count,
        percentage,
        color: colors[idx % colors.length],
        bgClass: bgClasses[idx % bgClasses.length],
        strokeDasharray: `${dashLength.toFixed(2)} 251.33`,
        strokeDashoffset: `-${offset.toFixed(2)}`,
      };
    });
  }, [suppliersList, dynamicCategories]);

  // Get Status Badge Color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/Login');
  };

  return (
    <div className={`flex h-screen ${isDark ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
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
          onRefresh={fetchSuppliers}
          isLoading={isLoading}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search suppliers..."
        />

        {/* Suppliers Content */}
        <div className="flex-1 overflow-auto">
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Suppliers</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
                      Manage supplier relationships, purchase partners, and supplier performance.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        exportToCSV('suppliers', filteredSuppliers, [
                          { key: 'name', label: 'Contact Person' },
                          { key: 'company', label: 'Company Name' },
                          { key: 'category', label: 'Category' },
                          { key: 'email', label: 'Email' },
                          { key: 'phone', label: 'Phone' },
                          { key: 'purchase', label: 'Total Purchases' },
                          { key: 'status', label: 'Status' },
                        ]);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer shadow-xs"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Export Excel
                    </button>

                    <button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
                      <PlusCircle className="w-5 h-5" />
                      <span>Add Supplier</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
              {/* Supplier Statistics */}
              <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {statsCards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={idx}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{card.title}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{card.value}</p>
                            <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">{card.subtitle}</p>
                          </div>
                          <div className="bg-sky-100 dark:bg-sky-900/40 p-3 rounded-lg">
                            <Icon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Quick Actions */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action, idx) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={idx}
                        onClick={action.onAction}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-sky-400 hover:-translate-y-1 transition-all duration-200 flex flex-col items-center justify-center gap-3 group cursor-pointer"
                      >
                        <div className="bg-sky-100 dark:bg-sky-900/40 p-3 rounded-lg group-hover:bg-sky-600 transition-colors duration-200">
                          <Icon className="w-6 h-6 text-sky-600 dark:text-sky-400 group-hover:text-white transition-colors duration-200" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white text-center">{action.title}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Search & Filters */}
              <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                  {/* Search */}
                  <div className="sm:col-span-2 lg:col-span-2">
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search Supplier"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-200"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-200"
                    >
                      <option value="all">Status</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-200"
                    >
                      <option value="all">Category</option>
                      <option value="raw">Raw Material</option>
                      <option value="packaging">Packaging</option>
                      <option value="electronics">Electronics</option>
                      <option value="office">Office Supplies</option>
                    </select>
                  </div>

                  {/* Sort */}
                  <div>
                    <select className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-200">
                      <option>Sort By</option>
                      <option>Name A-Z</option>
                      <option>Newest</option>
                      <option>Most Orders</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                      <Filter className="w-5 h-5" />
                      <span className="hidden sm:inline text-sm">Filter</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                      <Download className="w-5 h-5" />
                      <span className="hidden sm:inline text-sm">Export</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* Suppliers Table */}
              <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Supplier</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Company</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Category</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Phone</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Orders</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Total Purchase</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Status</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {isLoading ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-400">Loading suppliers...</td>
                        </tr>
                      ) : filteredSuppliers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-400">No suppliers found.</td>
                        </tr>
                      ) : filteredSuppliers.map((supplier) => (
                        <tr
                          key={supplier.dbId || supplier.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{supplier.name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{supplier.company}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200">
                              {supplier.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {supplier.phone}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              {supplier.email}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{supplier.orders}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{supplier.purchase}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(supplier.status)}`}>
                              {supplier.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button className="text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 text-sm font-medium transition-colors duration-200 cursor-pointer">
                                View
                              </button>
                              <button
                                onClick={() => handleDeleteSupplier(String(supplier.dbId || supplier.id))}
                                className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors duration-200"
                              >
                                Delete
                              </button>
                              <button className="text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-200">
                                <MoreHorizontal className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden p-4 space-y-4">
                  {filteredSuppliers.map((supplier) => (
                    <div
                      key={supplier.dbId || supplier.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{supplier.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{supplier.company}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(supplier.status)}`}>
                          {supplier.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span>{supplier.category}</span>
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{supplier.phone}</span>
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{supplier.email}</span>
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Orders</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{supplier.orders}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Purchase</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{supplier.purchase}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <button className="flex-1 text-sky-600 dark:text-sky-400 text-sm font-medium py-2 hover:bg-sky-50 dark:hover:bg-sky-900/40 rounded transition-colors duration-200 cursor-pointer">
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(String(supplier.dbId || supplier.id))}
                          className="flex-1 text-red-500 text-sm font-medium py-2 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Supplier Performance */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Supplier Rating */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Supplier Rating</h3>
                  <div className="text-center mb-8">
                    <div className="text-4xl mb-2">
                      <span className="text-yellow-400">★★★★★</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{averageRatingScore} / 5</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Average Rating from DB</p>
                  </div>
                  <div className="space-y-4">
                    {ratingMetrics.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.value}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-sky-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${item.value}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Purchase Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Purchase Distribution</h3>
                  {distributionData.length === 0 ? (
                    <div className="flex h-64 items-center justify-center text-sm text-gray-400">
                      No supplier distribution data available in database.
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      {/* Donut Chart - Dynamic SVG */}
                      <div className="relative w-40 h-40 mb-8">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {distributionData.map((item, idx) => (
                            <circle
                              key={idx}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke={item.color}
                              strokeWidth="8"
                              strokeDasharray={item.strokeDasharray}
                              strokeDashoffset={item.strokeDashoffset}
                              className="transition-all duration-500"
                            />
                          ))}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">100%</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total ({suppliersList.length})</p>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Legend */}
                      <div className="w-full space-y-2">
                        {distributionData.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${item.bgClass}`}></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                            <span className="ml-auto text-sm font-semibold text-gray-900 dark:text-white">{item.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Supplier Categories */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Supplier Categories</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dynamicCategories.length === 0 ? (
                    <p className="text-sm text-gray-400 col-span-4">No category data yet.</p>
                  ) : dynamicCategories.map((category, idx) => {
                    const Icon = category.icon;
                    return (
                      <div
                        key={idx}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="bg-sky-100 dark:bg-sky-900/40 p-3 rounded-lg">
                            <Icon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                          </div>
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{category.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{category.count} Supplier{category.count !== 1 ? 's' : ''}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Recent Supplier Activities */}
              <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Supplier Activities</h2>
                <div className="space-y-6">
                  {recentActivities.length === 0 ? (
                    <p className="text-sm text-gray-400">No recent supplier activity recorded yet.</p>
                  ) : recentActivities.map((activity, idx) => (
                    <div key={idx} className="flex gap-4">
                      {/* Timeline Indicator */}
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 bg-sky-600 rounded-full ring-4 ring-sky-100 dark:ring-sky-900"></div>
                        {idx !== recentActivities.length - 1 && (
                          <div className="w-0.5 h-12 bg-gray-200 dark:bg-gray-700 mt-2"></div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.event}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{activity.company}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 mt-2">
                          <Calendar className="w-3 h-3" />
                          <span>{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      {/* SUPPLIER PERFORMANCE MODAL */}
      <Dialog open={isPerformanceModalOpen} onOpenChange={setIsPerformanceModalOpen}>
        <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Supplier Performance Overview</h2>
                <p className="mt-0.5 text-xs text-sky-100 opacity-90">Based on current supplier data in database</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPerformanceModalOpen(false)}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-sky-50 dark:bg-sky-900/30 p-4 text-center border border-sky-100 dark:border-sky-800/40">
                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{suppliersList.length}</p>
                <p className="text-xs font-medium text-slate-500 mt-1">Total</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 p-4 text-center border border-emerald-100 dark:border-emerald-800/40">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {suppliersList.filter((s) => s.status === 'Active').length}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1">Active</p>
              </div>
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/30 p-4 text-center border border-amber-100 dark:border-amber-800/40">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {suppliersList.filter((s) => s.status === 'Pending').length}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1">Pending</p>
              </div>
            </div>

            {/* Performance metrics */}
            <div className="space-y-3 rounded-2xl bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200/60 dark:border-slate-800">
              {[
                { label: 'Active Rate', value: suppliersList.length > 0 ? Math.round((suppliersList.filter((s) => s.status === 'Active').length / suppliersList.length) * 100) : 0, color: 'bg-sky-500' },
                { label: 'Verified Suppliers', value: suppliersList.length > 0 ? Math.round((suppliersList.filter((s) => s.status !== 'Blocked').length / suppliersList.length) * 100) : 0, color: 'bg-emerald-500' },
                { label: 'Pending Review', value: suppliersList.length > 0 ? Math.round((suppliersList.filter((s) => s.status === 'Pending').length / suppliersList.length) * 100) : 0, color: 'bg-amber-500' },
              ].map((metric, idx) => (
                <div key={idx}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{metric.label}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{metric.value}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div className={`${metric.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${metric.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Top 3 suppliers */}
            {suppliersList.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Top Suppliers</p>
                <div className="space-y-2">
                  {suppliersList.slice(0, 3).map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/40 text-xs font-bold text-sky-700 dark:text-sky-300">
                          {String(s.name).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{s.company || s.category}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.status === 'Active' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPerformanceModalOpen(false)}
                className="flex-1 rounded-2xl border-slate-200 dark:border-slate-800"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => { setIsPerformanceModalOpen(false); router.push('/Reports'); }}
                className="flex-1 rounded-2xl bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
              >
                View Full Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD NEW SUPPLIER MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Add New Supplier</h2>
                <p className="mt-0.5 text-xs text-sky-100 opacity-90">Enter details to register a new supplier partner</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          <form onSubmit={handleAddSupplierSubmit} className="p-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={newSup.name}
                onChange={(e) => setNewSup({ ...newSup, name: e.target.value })}
                placeholder="e.g. PT Sumber Makmur"
                disabled={isSubmitting}
                className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Company Name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={newSup.company}
                onChange={(e) => setNewSup({ ...newSup, company: e.target.value })}
                placeholder="e.g. Sumber Makmur Indonesia"
                disabled={isSubmitting}
                className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Category
                </label>
                <select
                  value={newSup.category}
                  onChange={(e) => setNewSup({ ...newSup, category: e.target.value })}
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="Raw Material">Raw Material</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Office Supplies">Office Supplies</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Phone <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={newSup.phone}
                  onChange={(e) => setNewSup({ ...newSup, phone: e.target.value })}
                  placeholder="0812-3456-7890"
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                required
                type="email"
                value={newSup.email}
                onChange={(e) => setNewSup({ ...newSup, email: e.target.value })}
                placeholder="supplier@email.com"
                disabled={isSubmitting}
                className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
              />
            </div>

            <div className="flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-2xl border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
              >
                {isSubmitting ? "Saving..." : "Save Supplier"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}