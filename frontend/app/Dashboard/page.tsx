'use client';
import Sidebar from '@/components/ui/layout/sidebar';
import Topbar from '@/components/ui/layout/topbar';
import React, { useState } from 'react';
// import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  FileText,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
  Users,
  Zap,
  AlertCircle,
  Clock3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { getDashboardData } from '@/app/actions/dashboard';
import { getProducts } from '@/app/actions/products';
import { getCustomers } from '@/app/actions/customers';
import { getSales } from '@/app/actions/sales';
import { useEffect } from 'react';
import { formatPrice } from '@/lib/currency';
const Dashboard = () => {
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dashData, setDashData] = useState<{
    stats: { totalRevenue: string; ordersCount: number; productsCount: number; customersCount: number; revenueGrowth: number; ordersGrowth: number };
    lowStockProducts: Array<{ id: number | string; product: string; sku: string; current: number; minimum: number; status: string }>;
    recentSales: Array<{ id: number | string; customer: string; invoice: string; amount: string; status: string; date: string }>;
    activities: Array<{ id: number | string; type: string; title: string; description: string; time: string }>;
    revenueData: Array<{ month: string; revenue: number }>;
    weeklySalesData: Array<{ day: string; sales: number }>;
  }>({
    stats: { totalRevenue: "$0", ordersCount: 0, productsCount: 0, customersCount: 0, revenueGrowth: 0, ordersGrowth: 0 },
    lowStockProducts: [],
    recentSales: [],
    activities: [],
    revenueData: [
      { month: 'Jan', revenue: 0 },
      { month: 'Feb', revenue: 0 },
      { month: 'Mar', revenue: 0 },
      { month: 'Apr', revenue: 0 },
      { month: 'May', revenue: 0 },
      { month: 'Jun', revenue: 0 },
      { month: 'Jul', revenue: 0 },
      { month: 'Aug', revenue: 0 },
      { month: 'Sep', revenue: 0 },
      { month: 'Oct', revenue: 0 },
      { month: 'Nov', revenue: 0 },
      { month: 'Dec', revenue: 0 },
    ],
    weeklySalesData: [
      { day: 'Mon', sales: 0 },
      { day: 'Tue', sales: 0 },
      { day: 'Wed', sales: 0 },
      { day: 'Thu', sales: 0 },
      { day: 'Fri', sales: 0 },
      { day: 'Sat', sales: 0 },
      { day: 'Sun', sales: 0 },
    ],
  });

  const [isLoading, setIsLoading] = useState(false);

  const loadRealtimeDashboard = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Products via Server Action
      let products: Array<Record<string, unknown>> = [];
      try {
        const prodAction = await getProducts();
        if (prodAction && prodAction.success && Array.isArray(prodAction.data)) {
          products = prodAction.data as unknown as Array<Record<string, unknown>>;
        }
      } catch {
        // ignore
      }

      // 2. Fetch Customers via Server Action
      let customers: Array<Record<string, unknown>> = [];
      try {
        const custAction = await getCustomers();
        if (custAction && custAction.success && Array.isArray(custAction.data)) {
          customers = custAction.data as unknown as Array<Record<string, unknown>>;
        }
      } catch {
        // ignore
      }

      // 3. Fetch Sales — use server action (proxies to backend SQLite DB)
      let sales: Array<Record<string, unknown>> = [];
      try {
        const salesAction = await getSales();
        if (salesAction && salesAction.success && Array.isArray(salesAction.data)) {
          sales = salesAction.data as unknown as Array<Record<string, unknown>>;
        }
      } catch {
        // ignore
      }

      // 4. Fetch Dashboard server data (Prisma PostgreSQL — may or may not be available)
      const serverData = await getDashboardData();

      // Calculate dynamic metrics
      const productsCount = Math.max(products.length, serverData.stats.productsCount || 0);
      const customersCount = customers.length;
      // Use real sales count from backend SQLite
      const ordersCount = sales.length > 0 ? sales.length : (serverData.stats.ordersCount || 0);

      // Low Stock Products
      const lowStockProductsList = products.length > 0
        ? products
            .filter((p) => Number(p.stock || 0) <= Number(p.minStock || 15))
            .map((p, idx: number) => ({
              id: (p.id as string | number) || idx + 1,
              product: (p.name as string) || 'Product',
              sku: (p.sku as string) || 'N/A',
              current: Number(p.stock || 0),
              minimum: Number(p.minStock || 15),
              status: Number(p.stock || 0) === 0 ? 'critical' : 'warning',
            }))
        : serverData.lowStockProducts;

      // Total Revenue from real sales
      let totalRevNumber = 0;
      sales.forEach((s) => {
        const val = Number(String(s.totalAmount || s.total || 0).replace(/[^0-9.-]+/g, '')) || 0;
        totalRevNumber += val;
      });

      const totalRevenue = sales.length > 0
        ? formatPrice(totalRevNumber)
        : formatPrice(serverData.stats.totalRevenue);

      // Recent Sales from backend
      const recentSalesList = sales.length > 0
        ? sales.slice(0, 5).map((s: Record<string, unknown>, idx: number) => ({
            id: String(s.dbId || s.id || idx + 1),
            customer: String(s.customer || 'Walk-in Customer'),
            invoice: String(s.order || s.orderNumber || `SO-${s.id}`),
            amount: formatPrice(String(s.totalAmount || s.total || 0)),
            status: String(s.payment || s.paymentStatus || 'pending').toLowerCase(),
            date: String(s.date || 'Today'),
          }))
        : serverData.recentSales.map((s) => ({ ...s, amount: formatPrice(String(s.amount || 0)) }));

      // 12 Months Revenue Chart from real sales
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyTotals: Record<number, number> = {};
      for (let i = 0; i < 12; i++) monthlyTotals[i] = 0;

      sales.forEach((s: Record<string, unknown>) => {
        const val = Number(String(s.totalAmount || s.total || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const d = s.createdAt ? new Date(String(s.createdAt)) : (s.date ? new Date(String(s.date)) : new Date());
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          monthlyTotals[m] += val;
        }
      });

      const revenueData = monthNames.map((month, idx) => ({
        month,
        revenue: Math.round(monthlyTotals[idx] || 0),
      }));

      // Weekly Sales Chart
      const dayMapName: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
      const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dailyTotals: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

      sales.forEach((s: Record<string, unknown>) => {
        const val = Number(String(s.totalAmount || s.total || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const d = s.createdAt ? new Date(String(s.createdAt)) : new Date();
        const dayName = dayMapName[d.getDay()];
        if (dayName && Object.prototype.hasOwnProperty.call(dailyTotals, dayName)) {
          dailyTotals[dayName] += val;
        }
      });

      const weeklySalesData = dayOrder.map(day => ({ day, sales: Math.round(dailyTotals[day] || 0) }));

      // Calculate real MoM growth rates from sales data
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      let thisMonthRev = 0;
      let lastMonthRev = 0;
      let thisMonthOrdersCount = 0;
      let lastMonthOrdersCount = 0;

      sales.forEach((s: Record<string, unknown>) => {
        const val = Number(String(s.totalAmount || s.total || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const d = s.createdAt ? new Date(String(s.createdAt)) : (s.date ? new Date(String(s.date)) : new Date());
        const m = d.getMonth();
        const y = d.getFullYear();

        if (m === currentMonth && y === currentYear) {
          thisMonthRev += val;
          thisMonthOrdersCount += 1;
        } else if (m === prevMonth && y === prevMonthYear) {
          lastMonthRev += val;
          lastMonthOrdersCount += 1;
        }
      });

      const revenueGrowth = lastMonthRev > 0
        ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100)
        : (thisMonthRev > 0 ? 100 : 0);

      const ordersGrowth = lastMonthOrdersCount > 0
        ? Math.round(((thisMonthOrdersCount - lastMonthOrdersCount) / lastMonthOrdersCount) * 100)
        : (thisMonthOrdersCount > 0 ? 100 : 0);

      // Build customer activities from real customers list
      const customerActivities = customers.slice(0, 3).map((c: Record<string, unknown>) => ({
        id: `cust-${c.dbId || c.id}`,
        type: 'customer',
        title: 'New Customer Registered',
        description: `${c.name} (${c.company || 'Retail'})`,
        time: String(c.memberSince || 'Recently'),
      }));

      const mergedActivities = customerActivities.length > 0
        ? [...customerActivities, ...(serverData.activities || []).filter((a: Record<string, unknown>) => a.type !== 'customer')]
        : (serverData.activities || []);

      setDashData({
        stats: {
          totalRevenue,
          ordersCount,
          productsCount,
          customersCount,
          revenueGrowth,
          ordersGrowth,
        },
        lowStockProducts: lowStockProductsList || [],
        recentSales: recentSalesList || [],
        activities: mergedActivities,
        revenueData,
        weeklySalesData,
      });
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRealtimeDashboard();
    const handleCurrencyChange = () => loadRealtimeDashboard();
    window.addEventListener("currency_change", handleCurrencyChange);
    return () => window.removeEventListener("currency_change", handleCurrencyChange);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'stock':
        return <Package className="w-4 h-4 text-orange-500" />;
      case 'order':
        return <ShoppingCart className="w-4 h-4 text-green-500" />;
      case 'invoice':
        return <FileText className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock3 className="w-4 h-4 text-gray-500" />;
    }
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/Login");
  };

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
          onRefresh={loadRealtimeDashboard}
          isLoading={isLoading}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Welcome back! Here&apos;s what&apos;s happening in your business today.</p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 mb-8">
              <Button onClick={() => router.push("/Products")} className="bg-sky-600 hover:bg-sky-700 text-white flex-1 sm:flex-none">
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
              <Button onClick={() => router.push("/Sales")} variant="outline" className="border-gray-200 dark:border-gray-700 flex-1 sm:flex-none">
                <ShoppingCart className="w-4 h-4 mr-2" /> New Sale
              </Button>
              <Button onClick={() => router.push("/Customers")} variant="outline" className="border-gray-200 dark:border-gray-700 flex-1 sm:flex-none">
                <Users className="w-4 h-4 mr-2" /> New Customer
              </Button>
              <Button onClick={() => router.push("/ReportsPage")} variant="outline" className="border-gray-200 dark:border-gray-700 flex-1 sm:flex-none">
                <FileText className="w-4 h-4 mr-2" /> Export Report
              </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              {/* Total Revenue */}
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</CardTitle>
                    <div className="p-2 bg-sky-50 rounded-lg dark:bg-sky-950">
                      <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{dashData.stats.totalRevenue}</div>
                  <div className="flex items-center gap-2">
                    {dashData.stats.revenueGrowth >= 0 ? (
                      <>
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">+{dashData.stats.revenueGrowth}%</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="w-4 h-4 text-rose-600" />
                        <span className="text-sm font-medium text-rose-600">{dashData.stats.revenueGrowth}%</span>
                      </>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">vs last month</span>
                  </div>
                </CardContent>
              </Card>

              {/* Orders */}
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Orders</CardTitle>
                    <div className="p-2 bg-green-50 rounded-lg dark:bg-green-900/20">
                      <ShoppingCart className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{dashData.stats.ordersCount}</div>
                  <div className="flex items-center gap-2">
                    {dashData.stats.ordersGrowth >= 0 ? (
                      <>
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">+{dashData.stats.ordersGrowth}%</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="w-4 h-4 text-rose-600" />
                        <span className="text-sm font-medium text-rose-600">{dashData.stats.ordersGrowth}%</span>
                      </>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">vs last month</span>
                  </div>
                </CardContent>
              </Card>

              {/* Products */}
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Products</CardTitle>
                    <div className="p-2 bg-orange-50 rounded-lg dark:bg-orange-900/20">
                      <Package className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{dashData.stats.productsCount}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">In active catalog</div>
                </CardContent>
              </Card>

              {/* Customers */}
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Customers</CardTitle>
                    <div className="p-2 bg-purple-50 rounded-lg dark:bg-purple-900/20">
                      <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{dashData.stats.customersCount}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total customers</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle>Revenue</CardTitle>
                  <CardDescription>Revenue over last 12 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dashData.revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e5e7eb"} />
                      <XAxis dataKey="month" stroke={isDark ? "#94a3b8" : "#9ca3af"} />
                      <YAxis stroke={isDark ? "#94a3b8" : "#9ca3af"} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                          border: isDark ? '1px solid #1e293b' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: isDark ? '#f8fafc' : '#0f172a',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#0284c7"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Weekly Sales */}
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg">Weekly Sales</CardTitle>
                  <CardDescription>This week&apos;s performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashData.weeklySalesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e5e7eb"} />
                      <XAxis dataKey="day" stroke={isDark ? "#94a3b8" : "#9ca3af"} />
                      <YAxis stroke={isDark ? "#94a3b8" : "#9ca3af"} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                          border: isDark ? '1px solid #1e293b' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: isDark ? '#f8fafc' : '#0f172a',
                        }}
                      />
                      <Bar dataKey="sales" fill="#0284c7" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Low Stock & Recent Sales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Low Stock */}
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Low Stock Alert</CardTitle>
                    <CardDescription>Products running low</CardDescription>
                  </div>
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashData.lowStockProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{product.product}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{product.sku}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{product.current}</span>
                          <Badge
                            variant={product.status === 'critical' ? 'destructive' : 'secondary'}
                            className={product.status === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}
                          >
                            {product.status === 'critical' ? 'Critical' : 'Warning'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Sales */}
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle>Recent Sales</CardTitle>
                  <CardDescription>Latest transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashData.recentSales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg dark:hover:bg-gray-800 transition-colors">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{sale.customer}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{sale.invoice}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{sale.amount}</p>
                            <Badge
                              variant={
                                sale.status === 'paid'
                                  ? 'secondary'
                                  : sale.status === 'pending'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className={
                                sale.status === 'paid'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : sale.status === 'pending'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }
                            >
                              {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity & AI Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Activity Timeline */}
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <CardDescription>Latest business events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashData.activities.map((activity, idx) => (
                      <div key={activity.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="p-2 bg-gray-100 rounded-full dark:bg-gray-800">
                            {getActivityIcon(activity.type)}
                          </div>
                          {idx !== dashData.activities.length - 1 && (
                            <div className="w-0.5 h-12 bg-gray-200 dark:bg-gray-700 mt-2"></div>
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{activity.description}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <Clock3 className="w-3 h-3" /> {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights */}
              <Card className="bg-linear-to-br from-sky-600 via-sky-500 to-indigo-600 text-white border-0 shadow-lg shadow-sky-500/20 dark:from-sky-950 dark:via-sky-900 dark:to-indigo-950">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">AI Business Insights</CardTitle>
                    <Zap className="w-5 h-5 text-sky-200" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                      <p className="text-sm font-semibold mb-1">Sales Performance</p>
                      <p className="text-sm text-sky-100 opacity-95">Sales increased 18% compared to last month. Your revenue reached an all-time high.</p>
                    </div>
                    <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                      <p className="text-sm font-semibold mb-1">Stock Alert</p>
                      <p className="text-sm text-sky-100 opacity-95">&quot;Wireless Mouse&quot; is predicted to run out in 5 days. Consider restocking soon.</p>
                    </div>
                    <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                      <p className="text-sm font-semibold mb-1">Top Customer</p>
                      <p className="text-sm text-sky-100 opacity-95">Your top customer generated 28% of this month&apos;s revenue. Maintain great service.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-8 border-t border-gray-200 dark:border-gray-800">
              <div className="flex gap-6">
                <span>Version 1.0.0</span>
                <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300">Privacy Policy</a>
                <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300">Terms of Service</a>
              </div>
              <span>© 2026 FlowERP. All rights reserved.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;