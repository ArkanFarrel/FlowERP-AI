'use client';
import Sidebar from '@/components/ui/layout/sidebar';
import Topbar from '@/components/ui/layout/topbar';
import { useMemo, useState, useCallback } from 'react';
import { apiFetch } from "@/lib/api";
import { useRouter } from 'next/navigation';
import { exportToCSV } from '@/lib/export';
import { formatPrice } from '@/lib/currency';
import {
  BarChart3,
  Building2,
  Download,
  Eye,
  Filter,
  Mail,
  MapPin,
  NotebookPen,
  Pencil,
  Phone,
  Repeat,
  Search,
  Star,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type CustomerStatus = 'Active' | 'Inactive' | 'VIP' | 'Blocked' | 'New';

type Customer = {
  id: string;
  dbId?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  salesRep: string;
  orders: number;
  lifetimeValue: number;
  status: CustomerStatus;
  lastPurchase: string;
  type: string;
  address: string;
  memberSince: string;
  assignedSalesperson: string;
  averagePurchase: number;
  creditLimit: number;
  outstandingBalance: number;
  loyaltyPoints: number;
  healthScore: number;
  segment: string;
  revenue: number;
  growth: number;
  avgOrder: number;
};

const pageSize = 4;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function StatusBadge({ status }: { status: CustomerStatus }) {
  const styles: Record<CustomerStatus, string> = {
    Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Inactive: 'bg-slate-100 text-slate-700 ring-slate-200',
    VIP: 'bg-violet-50 text-violet-700 ring-violet-200',
    Blocked: 'bg-rose-50 text-rose-700 ring-rose-200',
    New: 'bg-sky-50 text-sky-700 ring-sky-200',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}>
      {status}
    </span>
  );
}


import { useEffect } from 'react';
import { getCustomers, createCustomer, deleteCustomer, updateCustomer } from '@/app/actions/customers';
import { Dialog, DialogContent } from '@/components/ui/dialog';


export default function CustomersPage() {

  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('All');
  const [country, setCountry] = useState('All');
  const [city, setCity] = useState('All');
  const [salesRep, setSalesRep] = useState('All');
  const [status, setStatus] = useState('All');
  const [date, setDate] = useState('All');
  const [type, setType] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [editCust, setEditCust] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCust, setNewCust] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    city: 'Jakarta',
    country: 'Indonesia',
    type: 'Retail',
    creditLimit: 10000,
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

interface BackendCustomerItem {
  id?: string;
  code?: string;
  name?: string;
  companyName?: string;
  company?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  salesRep?: string;
  status?: string;
  isActive?: boolean;
  creditLimit?: number;
  outstandingBalance?: number;
  loyaltyPoints?: number;
  createdAt?: string;
  type?: string;
  address?: string;
  healthScore?: number;
  segment?: string;
  _count?: { salesOrders?: number };
  salesOrders?: Array<{ totalAmount?: number; createdAt?: string }>;
}

  const fetchCustomers = useCallback(() => {
    setIsLoading(true);
    getCustomers()
      .then((serverRes) => {
        if (serverRes && serverRes.success && Array.isArray(serverRes.data)) {
          setCustomersList(serverRes.data as unknown as Customer[]);
          return;
        }
        return apiFetch('/customers').then((res) => {
          if (res && res.success && Array.isArray(res.data)) {
            setCustomersList(
              res.data.map((c: BackendCustomerItem) => {
                const ordersCount = c._count?.salesOrders ?? (c.salesOrders?.length || 0);
                const totalLtv = c.salesOrders?.reduce((acc: number, s: { totalAmount?: number }) => acc + (s.totalAmount || 0), 0) || Number(c.outstandingBalance) || 0;
                const lastSale = c.salesOrders && c.salesOrders.length > 0 ? new Date(c.salesOrders[0].createdAt || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : 'No orders';
                const avgOrder = ordersCount > 0 ? Math.round(totalLtv / ordersCount) : 0;

                return {
                  id: String(c.code || c.id || Math.random()),
                  dbId: String(c.id || ''),
                  name: String(c.name || 'Customer'),
                  company: String(c.companyName || c.company || 'N/A'),
                  email: String(c.email || 'N/A'),
                  phone: String(c.phone || 'N/A'),
                  city: String(c.city || 'N/A'),
                  country: String(c.country || 'N/A'),
                  salesRep: String(c.salesRep || 'Owner'),
                  orders: ordersCount,
                  lifetimeValue: totalLtv,
                  status: String(c.status || (c.isActive === false ? 'Inactive' : 'Active')),
                  lastPurchase: lastSale,
                  type: String(c.type || 'Retail'),
                  address: String(c.address || ''),
                  memberSince: c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : 'N/A',
                  assignedSalesperson: String(c.salesRep || 'Owner'),
                  averagePurchase: avgOrder,
                  creditLimit: Number(c.creditLimit) || 0,
                  outstandingBalance: Number(c.outstandingBalance) || 0,
                  loyaltyPoints: Number(c.loyaltyPoints) || 0,
                  healthScore: Number(c.healthScore) || 100,
                  segment: String(c.segment || 'Regular'),
                  revenue: totalLtv,
                  growth: 0,
                  avgOrder: avgOrder,
                } as Customer;
              })
            );
          } else {
            setCustomersList([]);
          }
        });
      })
      .catch(() => {
        setCustomersList([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCustomers();
  }, [fetchCustomers]);

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let res;
      try {
        res = await createCustomer({
          name: newCust.name,
          company: newCust.company,
          email: newCust.email,
          phone: newCust.phone,
          city: newCust.city,
          country: newCust.country,
          type: newCust.type,
          creditLimit: Number(newCust.creditLimit) || 5000,
        });
      } catch {
        // fallback to apiFetch if server action fails
      }

      if (!res || !res.success) {
        try {
          res = await apiFetch('/customers', {
            method: 'POST',
            body: JSON.stringify({
              name: newCust.name,
              companyName: newCust.company,
              email: newCust.email,
              phone: newCust.phone,
              city: newCust.city,
              country: newCust.country,
              creditLimit: Number(newCust.creditLimit) || 5000,
            }),
          });
        } catch {
          // ignore
        }
      }

      if (res && res.success) {
        setIsAddModalOpen(false);
        setNewCust({
          name: '',
          company: '',
          email: '',
          phone: '',
          city: 'Jakarta',
          country: 'Indonesia',
          type: 'Retail',
          creditLimit: 10000,
        });
        fetchCustomers();
      } else {
        alert(res?.error || 'Failed to add customer');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add customer';
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dynamicKpiCards = useMemo(() => {
    const totalCount = customersList.length;
    const activeCount = customersList.filter((c) => c.status === 'Active' || c.status === 'VIP' || c.status === 'New').length;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const newCount = customersList.filter((c) => {
      if (c.status === 'New') return true;
      if (!c.memberSince || c.memberSince === 'N/A') return false;
      const d = new Date(c.memberSince);
      if (isNaN(d.getTime())) return false;
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const totalLtv = customersList.reduce((acc, c) => acc + (c.lifetimeValue || 0), 0);
    const avgLtv = totalCount > 0 ? Math.round(totalLtv / totalCount) : 0;
    const withOrders = customersList.filter((c) => c.orders > 0).length;
    const returningPct = totalCount > 0 ? Math.round((withOrders / totalCount) * 100) : 0;

    return [
      { title: 'Total Customers', value: totalCount.toLocaleString(), icon: Users, accent: 'bg-blue-600 text-white' },
      { title: 'Active Customers', value: activeCount.toLocaleString(), icon: UserCheck, accent: 'bg-emerald-600 text-white' },
      { title: 'New Customers', value: newCount.toLocaleString(), sub: 'This Month', icon: UserPlus, accent: 'bg-sky-600 text-white' },
      { title: 'Repeat Order Rate', value: `${returningPct}%`, icon: Repeat, accent: 'bg-violet-600 text-white' },
      { title: 'Avg Customer LTV', value: formatPrice(avgLtv), icon: Wallet, accent: 'bg-amber-600 text-white' },
      { title: 'Total Customer Revenue', value: formatPrice(totalLtv), icon: Star, accent: 'bg-yellow-500 text-slate-900' },
    ];
  }, [customersList]);

  const dynamicSegments = useMemo(() => {
    const totalCount = customersList.length || 1;
    const retailCount = customersList.filter((c) => c.type === 'Retail' || c.segment === 'Retail').length;
    const wholesaleCount = customersList.filter((c) => c.type === 'Wholesale' || c.segment === 'Wholesale').length;
    const vipCount = customersList.filter((c) => c.status === 'VIP' || c.segment === 'VIP').length;
    const activeCount = customersList.filter((c) => c.status === 'Active').length;

    return [
      { name: 'Retail Customers', customers: retailCount, percentage: Math.round((retailCount / totalCount) * 100) },
      { name: 'Wholesale Customers', customers: wholesaleCount, percentage: Math.round((wholesaleCount / totalCount) * 100) },
      { name: 'VIP Customers', customers: vipCount, percentage: Math.round((vipCount / totalCount) * 100) },
      { name: 'Active Customers', customers: activeCount, percentage: Math.round((activeCount / totalCount) * 100) },
    ];
  }, [customersList]);

  const handleDeleteCustomer = async (id: string, dbId?: string) => {
    const targetId = dbId || id;
    if (confirm('Are you sure you want to delete this customer?')) {
      let res;
      try {
        res = await deleteCustomer(targetId);
      } catch (e) {
        console.warn('Delete customer server action note:', e);
      }

      if (!res || !res.success) {
        try {
          await apiFetch(`/customers/${targetId}`, { method: 'DELETE' });
        } catch {
          // ignore REST fallback note
        }
      }

      setCustomersList((prev) => prev.filter((c) => c.id !== id && c.dbId !== targetId));
      fetchCustomers();
    }
  };

  const handleEditCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCust) return;
    setIsSubmitting(true);
    try {
      const targetId = editCust.dbId || editCust.id;
      const res = await updateCustomer(targetId, editCust);
      if (res && res.success) {
        fetchCustomers();
        setIsEditModalOpen(false);
        setEditCust(null);
      } else {
        alert(res?.error || 'Failed to update customer');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update customer';
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };


  const filteredCustomers = useMemo(() => {
    return customersList.filter((customer) => {
      const query = search.toLowerCase();
      const matchesQuery =
        customer.name.toLowerCase().includes(query) ||
        customer.company.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        customer.id.toLowerCase().includes(query);
      const matchesGroup = group === 'All' || customer.segment === group;
      const matchesCountry = country === 'All' || customer.country === country;
      const matchesCity = city === 'All' || customer.city === city;
      const matchesSalesRep = salesRep === 'All' || customer.salesRep === salesRep;
      const matchesStatus = status === 'All' || customer.status === status;
      const matchesType = type === 'All' || customer.type === type;
      const matchesDate = date === 'All' || (date === 'This Month' && customer.lastPurchase.includes('day'));

      return (
        matchesQuery &&
        matchesGroup &&
        matchesCountry &&
        matchesCity &&
        matchesSalesRep &&
        matchesStatus &&
        matchesType &&
        matchesDate
      );
    });
  }, [search, group, country, city, salesRep, status, date, type, customersList]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const pagedCustomers = filteredCustomers.slice((page - 1) * pageSize, page * pageSize);

  const resetFilters = () => {
    setSearch('');
    setGroup('All');
    setCountry('All');
    setCity('All');
    setSalesRep('All');
    setStatus('All');
    setDate('All');
    setType('All');
    setPage(1);
    setSelected([]);
  };

  const toggleSelect = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === pagedCustomers.length) {
      setSelected([]);
      return;
    }
    setSelected(pagedCustomers.map((customer) => customer.id));
  };

  const selectedLabel = selected.length > 0 ? `${selected.length} selected` : 'Bulk actions';

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
          onRefresh={fetchCustomers}
          isLoading={isLoading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search customers..."
        />

        {/* Customers Content */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between lg:px-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-sky-600">
                    <Building2 className="h-4 w-4" />
                    FlowERP AI / Customers
                  </div>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Customers</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-600">
                      Manage customer information, purchase history, contacts, loyalty, and customer relationships in one centralized workspace.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 cursor-pointer shadow-lg shadow-sky-500/20"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportToCSV('customers', filteredCustomers, [
                        { key: 'name', label: 'Customer Name' },
                        { key: 'company', label: 'Company Name' },
                        { key: 'email', label: 'Email' },
                        { key: 'phone', label: 'Phone' },
                        { key: 'city', label: 'City' },
                        { key: 'orders', label: 'Total Orders' },
                        { key: 'lifetimeValue', label: 'Lifetime Spent' },
                        { key: 'status', label: 'Status' },
                      ]);
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <Download className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Export Customers
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:p-8">
                {dynamicKpiCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.title} className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{card.title}</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{card.value}</p>
                          {card.sub ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{card.sub}</p> : null}
                        </div>
                        <div className={`rounded-xl p-3 ${card.accent}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4 lg:px-8">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Customer Growth</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Track engagement, retention, and value trends across your customer base.</p>
                </div>
                <div className="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300">Sky analytics</div>
              </div>
              <div className="grid gap-6 p-5 lg:grid-cols-[1.3fr,0.7fr] lg:p-8">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Monthly New Customers</p>
                      <p className="text-2xl font-semibold text-slate-900 dark:text-white">+16.4%</p>
                    </div>
                    <div className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300">+24% QoQ</div>
                  </div>
                  <svg viewBox="0 0 320 140" className="h-40 w-full">
                    <path d="M0 108 C28 96 44 92 68 84 S112 72 136 64 S180 50 204 58 S248 74 272 62 S304 44 320 28" fill="none" stroke="#0284c7" strokeWidth="3" />
                    <path d="M0 108 C28 96 44 92 68 84 S112 72 136 64 S180 50 204 58 S248 74 272 62 S304 44 320 28 L320 140 L0 140 Z" fill="url(#gradient)" />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.03" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Active Customer Ratio', value: customersList.length > 0 ? `${Math.round((customersList.filter(c => c.status === 'Active' || c.status === 'VIP').length / customersList.length) * 100)}%` : '0%', trend: 'Real' },
                    { label: 'Customers With Purchases', value: customersList.length > 0 ? `${Math.round((customersList.filter(c => c.orders > 0).length / customersList.length) * 100)}%` : '0%', trend: 'Real' },
                    { label: 'Total Customer Value', value: formatCurrency(customersList.reduce((acc, c) => acc + (c.lifetimeValue || 0), 0)), trend: 'Real' },
                    { label: 'Average Customer Spend', value: formatCurrency(customersList.length > 0 ? Math.round(customersList.reduce((acc, c) => acc + (c.lifetimeValue || 0), 0) / customersList.length) : 0), trend: 'Real' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 p-4">
                      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                        <span>{item.label}</span>
                        <span className="font-semibold text-sky-700 dark:text-sky-400">{item.trend}</span>
                      </div>
                      <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4 lg:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Filters</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Refine the customer list with advanced segmentation.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <Filter className="h-4 w-4" />
                    {filteredCustomers.length} matching customers
                  </div>
                </div>
              </div>
              <div className="grid gap-4 p-5 lg:grid-cols-3 xl:grid-cols-4 lg:p-8">
                <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Search Customer</span>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 px-3 py-2.5">
                    <Search className="mr-2 h-4 w-4 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Search by name or email"
                      className="w-full border-none bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                </label>
                <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Customer Group</span>
                  <select value={group} onChange={(event) => setGroup(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 outline-none">
                    <option>All</option>
                    <option>VIP</option>
                    <option>Regular</option>
                    <option>Wholesale</option>
                    <option>Retail</option>
                    <option>New</option>
                    <option>Returning</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Country</span>
                  <select value={country} onChange={(event) => setCountry(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 outline-none">
                    <option>All</option>
                    {Array.from(new Set(customersList.map((c) => c.country).filter(Boolean))).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium">City</span>
                  <select value={city} onChange={(event) => setCity(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 outline-none">
                    <option>All</option>
                    {Array.from(new Set(customersList.map((c) => c.city).filter((c) => c && c !== '-'))).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Sales Representative</span>
                  <select value={salesRep} onChange={(event) => setSalesRep(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 outline-none">
                    <option>All</option>
                    {Array.from(new Set(customersList.map((c) => c.salesRep).filter((c) => c && c !== '-'))).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Status</span>
                  <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 outline-none">
                    <option>All</option>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>VIP</option>
                    <option>Blocked</option>
                    <option>New</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Registration Date</span>
                  <select value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 outline-none">
                    <option>All</option>
                    <option>This Month</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Customer Type</span>
                  <select value={type} onChange={(event) => setType(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 outline-none">
                    <option>All</option>
                    <option>Retail</option>
                    <option>Wholesale</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-end lg:px-8">
                <button onClick={() => { setPage(1); setSelected([]); }} className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 cursor-pointer">
                  <Filter className="mr-2 h-4 w-4" />
                  Apply Filters
                </button>
                <button onClick={resetFilters} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer">
                  Reset Filters
                </button>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.7fr,0.9fr]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Customers</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage customer records with actions for sales, invoicing, and follow-up.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="inline-flex items-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Bulk Export
                    </button>
                    <button className="inline-flex items-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                      <Mail className="mr-2 h-4 w-4" />
                      Bulk Email
                    </button>
                    <button className="inline-flex items-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                      <UserRound className="mr-2 h-4 w-4" />
                      Assign Salesperson
                    </button>
                  </div>
                </div>

                <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-3 text-sm text-slate-600 dark:text-slate-400 lg:px-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white dark:bg-slate-800 dark:text-slate-200 px-3 py-1.5 font-medium text-slate-700 shadow-sm">{selectedLabel}</span>
                    <button className="rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Bulk Delete</button>
                    <button className="rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Bulk Assign</button>
                  </div>
                </div>

                {filteredCustomers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-5 py-12 text-center lg:px-8">
                    <div className="mb-4 rounded-full bg-sky-50 dark:bg-sky-950 p-6 text-sky-600 dark:text-sky-400">
                      <Users className="h-10 w-10" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No Customers Found</h3>
                    <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">Try changing your search or filters to find the right customers.</p>
                    <button onClick={() => setIsAddModalOpen(true)} className="mt-5 inline-flex items-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 shadow-lg shadow-sky-500/20 cursor-pointer">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add New Customer
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto lg:block">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
                          <tr>
                            <th className="w-10 px-4 py-3">
                              <input type="checkbox" checked={selected.length === pagedCustomers.length && pagedCustomers.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-slate-300 dark:border-slate-700" />
                            </th>
                            <th className="px-4 py-3 font-medium">Customer ID</th>
                            <th className="px-4 py-3 font-medium">Customer Name</th>
                            <th className="px-4 py-3 font-medium">Company</th>
                            <th className="px-4 py-3 font-medium">Email</th>
                            <th className="px-4 py-3 font-medium">Phone</th>
                            <th className="px-4 py-3 font-medium">City</th>
                            <th className="px-4 py-3 font-medium">Sales Rep</th>
                            <th className="px-4 py-3 font-medium">Orders</th>
                            <th className="px-4 py-3 font-medium">Lifetime Value</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Last Purchase</th>
                            <th className="px-4 py-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                          {pagedCustomers.map((customer) => (
                            <tr key={customer.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                              <td className="px-4 py-3">
                                <input type="checkbox" checked={selected.includes(customer.id)} onChange={() => toggleSelect(customer.id)} className="h-4 w-4 rounded border-slate-300 dark:border-slate-700" />
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{customer.id}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950 text-sm font-semibold text-sky-700 dark:text-sky-300">
                                    {customer.name.split(' ').map((word) => word[0]).join('').slice(0, 2)}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-900 dark:text-white">{customer.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{customer.type}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">{customer.company}</td>
                              <td className="px-4 py-3">{customer.email}</td>
                              <td className="px-4 py-3">{customer.phone}</td>
                              <td className="px-4 py-3">{customer.city}</td>
                              <td className="px-4 py-3">{customer.salesRep}</td>
                              <td className="px-4 py-3">{customer.orders} Orders</td>
                              <td className="px-4 py-3">{formatCurrency(customer.lifetimeValue)}</td>
                              <td className="px-4 py-3"><StatusBadge status={customer.status} /></td>
                              <td className="px-4 py-3">{customer.lastPurchase}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => { setActiveCustomer(customer); setIsViewModalOpen(true); }}
                                    title="View Profile Details"
                                    className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => { setEditCust(customer); setIsEditModalOpen(true); }}
                                    title="Edit Customer"
                                    className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 cursor-pointer"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => router.push('/ReportsPage')}
                                    title="View Analytics Report"
                                    className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 cursor-pointer"
                                  >
                                    <BarChart3 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => router.push(`/Sales?customerId=${customer.id}`)}
                                    title="Create Invoice / Order"
                                    className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 cursor-pointer"
                                  >
                                    <NotebookPen className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCustomer(customer.id, customer.dbId)}
                                    title="Delete Customer"
                                    className="rounded-full border border-slate-200 bg-white p-2 text-rose-600 transition hover:bg-rose-50 cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-3 p-4 lg:hidden">
                      {pagedCustomers.map((customer) => (
                        <div key={customer.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{customer.name}</p>
                              <p className="text-sm text-slate-600">{customer.company}</p>
                            </div>
                            <StatusBadge status={customer.status} />
                          </div>
                          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                            <div className="flex items-center gap-2"><Mail className="h-4 w-4" />{customer.email}</div>
                            <div className="flex items-center gap-2"><Phone className="h-4 w-4" />{customer.phone}</div>
                            <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{customer.city}</div>
                            <div className="flex items-center gap-2"><Wallet className="h-4 w-4" />{formatCurrency(customer.lifetimeValue)}</div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button onClick={() => { setActiveCustomer(customer); setIsViewModalOpen(true); }} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer">View</button>
                            <button onClick={() => { setEditCust(customer); setIsEditModalOpen(true); }} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer">Edit</button>
                            <button onClick={() => router.push(`/Sales?customerId=${customer.id}`)} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer">Invoice</button>
                            <button onClick={() => handleDeleteCustomer(customer.id, customer.dbId)} className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 cursor-pointer">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                      <div className="text-sm text-slate-600">
                        Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredCustomers.length)} of {filteredCustomers.length} customers
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Previous</button>
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
                          <button key={item} onClick={() => setPage(item)} className={`rounded-xl px-3 py-2 text-sm font-medium ${page === item ? 'bg-sky-600 text-white' : 'border border-slate-200 text-slate-600'}`}>
                            {item}
                          </button>
                        ))}
                        <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Next</button>
                      </div>
                    </div>
                  </>
                )}
              </section>

              <aside className="space-y-6">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Customer Profile Preview</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Key account details and next best action.</p>
                  </div>
                  <div className="space-y-4 p-5">
                    {pagedCustomers.length > 0 ? (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950 text-lg font-semibold text-sky-700 dark:text-sky-300">
                            {pagedCustomers[0].name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">{pagedCustomers[0].name}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{pagedCustomers[0].company}</p>
                            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <Mail className="h-4 w-4" />
                              {pagedCustomers[0].email}
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 p-4 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center justify-between"><span>Phone</span><span className="font-medium text-slate-900 dark:text-white">{pagedCustomers[0].phone}</span></div>
                          <div className="flex items-center justify-between"><span>City</span><span className="font-medium text-slate-900 dark:text-white">{pagedCustomers[0].city}</span></div>
                          <div className="flex items-center justify-between"><span>Country</span><span className="font-medium text-slate-900 dark:text-white">{pagedCustomers[0].country}</span></div>
                          <div className="flex items-center justify-between"><span>Member Since</span><span className="font-medium text-slate-900 dark:text-white">{pagedCustomers[0].memberSince}</span></div>
                          <div className="flex items-center justify-between"><span>Customer Type</span><span className="font-medium text-slate-900 dark:text-white">{pagedCustomers[0].type}</span></div>
                          <div className="flex items-center justify-between"><span>Total Orders</span><span className="font-medium text-slate-900 dark:text-white">{pagedCustomers[0].orders}</span></div>
                          <div className="flex items-center justify-between"><span>Credit Limit</span><span className="font-medium text-slate-900 dark:text-white">${Number(pagedCustomers[0].creditLimit || 0).toLocaleString()}</span></div>
                          <div className="flex items-center justify-between"><span>Outstanding Balance</span><span className="font-medium text-slate-900 dark:text-white">${Number(pagedCustomers[0].outstandingBalance || 0).toLocaleString()}</span></div>
                          <div className="flex items-center justify-between"><span>Loyalty Points</span><span className="font-medium text-slate-900 dark:text-white">{Number(pagedCustomers[0].loyaltyPoints || 0).toLocaleString()}</span></div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 p-4">
                          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                            <span>Customer Health Score</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{pagedCustomers[0].healthScore || 90}%</span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                            <div className="h-2 rounded-full bg-sky-600" style={{ width: `${pagedCustomers[0].healthScore || 90}%` }} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        No customer selected. Add a customer to view profile preview.
                      </div>
                    )}
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Customer Segmentation</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Breakdown of active customer distribution.</p>
                  </div>
                  <div className="grid gap-3 p-5 sm:grid-cols-2">
                    {dynamicSegments.map((segment) => (
                      <div key={segment.name} className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{segment.name}</p>
                          <span className="text-xs font-medium text-sky-700 dark:text-sky-400">{segment.percentage}%</span>
                        </div>
                        <div className="mt-3 flex items-end justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>{segment.customers} customers</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                          <div className="h-2 rounded-full bg-sky-600" style={{ width: `${segment.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            </div>
          </main>
        </div>
      </div>
      {/* ADD CUSTOMER MODAL — Styled like Sales page */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) setNewCust({ name: '', company: '', email: '', phone: '', city: 'Jakarta', country: 'Indonesia', type: 'Retail', creditLimit: 10000 }); }}>
        <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          {/* Header */}
          <div className="bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Add New Customer</h2>
                <p className="mt-0.5 text-xs text-sky-100 opacity-90">Enter customer details below</p>
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

          {/* Form */}
          <form onSubmit={handleAddCustomerSubmit} className="p-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={newCust.name}
                onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                placeholder="e.g. Alex Johnson"
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
                value={newCust.company}
                onChange={(e) => setNewCust({ ...newCust, company: e.target.value })}
                placeholder="e.g. PT Maju Bersama"
                disabled={isSubmitting}
                className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  value={newCust.email}
                  onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                  placeholder="alex@company.com"
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Phone <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  placeholder="+62 812 3456 7890"
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  City
                </label>
                <Input
                  value={newCust.city}
                  onChange={(e) => setNewCust({ ...newCust, city: e.target.value })}
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Type
                </label>
                <select
                  value={newCust.type}
                  onChange={(e) => setNewCust({ ...newCust, type: e.target.value })}
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="Retail">Retail</option>
                  <option value="Wholesale">Wholesale</option>
                </select>
              </div>
            </div>

            {/* Buttons */}
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
                className="flex-1 rounded-2xl bg-sky-600 text-white hover:bg-sky-700"
              >
                {isSubmitting ? 'Saving...' : 'Save Customer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW CUSTOMER DETAILS MODAL */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          {activeCustomer && (
            <div>
              <div className="bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20 relative">
                <button onClick={() => setIsViewModalOpen(false)} className="absolute top-4 right-4 text-white/80 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold">
                    {activeCustomer.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{activeCustomer.name}</h3>
                    <p className="text-sm text-sky-100">{activeCustomer.company}</p>
                    <span className="mt-1 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">{activeCustomer.status}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4 text-sm text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">Email</span>
                    <p className="font-medium text-slate-900 dark:text-white truncate">{activeCustomer.email}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">Phone</span>
                    <p className="font-medium text-slate-900 dark:text-white">{activeCustomer.phone}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">City / Country</span>
                    <p className="font-medium text-slate-900 dark:text-white">{activeCustomer.city}, {activeCustomer.country}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">Sales Rep</span>
                    <p className="font-medium text-slate-900 dark:text-white">{activeCustomer.salesRep}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 p-4 text-center dark:border-slate-800">
                    <p className="text-xs text-slate-500">Credit Limit</p>
                    <p className="text-lg font-bold text-sky-600">${Number(activeCustomer.creditLimit || 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 text-center dark:border-slate-800">
                    <p className="text-xs text-slate-500">Outstanding Balance</p>
                    <p className="text-lg font-bold text-amber-600">${Number(activeCustomer.outstandingBalance || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={() => { setIsViewModalOpen(false); router.push(`/Sales?customerId=${activeCustomer.id}`); }} className="flex-1 bg-sky-600 text-white hover:bg-sky-700">
                    Create Invoice
                  </Button>
                  <Button onClick={() => { setIsViewModalOpen(false); setEditCust(activeCustomer); setIsEditModalOpen(true); }} variant="outline" className="flex-1">
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT CUSTOMER MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Edit Customer</h2>
                <p className="mt-0.5 text-xs text-sky-100 opacity-90">Update customer information</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {editCust && (
            <form onSubmit={handleEditCustomerSubmit} className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={editCust.name}
                  onChange={(e) => setEditCust({ ...editCust, name: e.target.value })}
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
                  value={editCust.company}
                  onChange={(e) => setEditCust({ ...editCust, company: e.target.value })}
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="email"
                    value={editCust.email}
                    onChange={(e) => setEditCust({ ...editCust, email: e.target.value })}
                    disabled={isSubmitting}
                    className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={editCust.phone}
                    onChange={(e) => setEditCust({ ...editCust, phone: e.target.value })}
                    disabled={isSubmitting}
                    className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    City
                  </label>
                  <Input
                    value={editCust.city}
                    onChange={(e) => setEditCust({ ...editCust, city: e.target.value })}
                    disabled={isSubmitting}
                    className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Type
                  </label>
                  <select
                    value={editCust.type}
                    onChange={(e) => setEditCust({ ...editCust, type: e.target.value })}
                    disabled={isSubmitting}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
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
                  {isSubmitting ? 'Saving...' : 'Update Customer'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}