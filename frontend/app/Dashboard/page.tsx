/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Sidebar from "@/components/ui/layout/sidebar";
import Topbar from "@/components/ui/layout/topbar";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Camera,
  ChevronDown,
  Check,
} from "lucide-react";
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
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { getDashboardData } from "@/app/actions/dashboard";
import { getProducts } from "@/app/actions/products";
import { getCustomers } from "@/app/actions/customers";
import { getSales } from "@/app/actions/sales";
import { formatPrice } from "@/lib/currency";

type DateRangeType = "today" | "week" | "month" | "quarter" | "year" | "custom";

const Dashboard = () => {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Feature B1: Dynamic Date Range State
  const [dateRange, setDateRange] = useState<DateRangeType>("month");
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Feature B2: Quick Action Speed-Dial State
  // const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);

  // Raw Database Data Holders
  const [rawSales, setRawSales] = useState<Array<Record<string, any>>>([]);
  const [rawProducts, setRawProducts] = useState<Array<Record<string, any>>>(
    [],
  );
  const [rawCustomers, setRawCustomers] = useState<Array<Record<string, any>>>(
    [],
  );
  const [serverDashboardData, setServerDashboardData] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(false);

  const loadRealtimeDashboard = async () => {
    setIsLoading(true);
    try {
      const [prodRes, custRes, salesRes, serverDash] = await Promise.allSettled(
        [getProducts(), getCustomers(), getSales(), getDashboardData()],
      );

      if (
        prodRes.status === "fulfilled" &&
        prodRes.value?.success &&
        Array.isArray(prodRes.value.data)
      ) {
        setRawProducts(prodRes.value.data);
      }
      if (
        custRes.status === "fulfilled" &&
        custRes.value?.success &&
        Array.isArray(custRes.value.data)
      ) {
        setRawCustomers(custRes.value.data);
      }
      if (
        salesRes.status === "fulfilled" &&
        salesRes.value?.success &&
        Array.isArray(salesRes.value.data)
      ) {
        setRawSales(salesRes.value.data);
      }
      if (serverDash.status === "fulfilled") {
        setServerDashboardData(serverDash.value);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRealtimeDashboard();
    const handleCurrencyChange = () => loadRealtimeDashboard();
    window.addEventListener("currency_change", handleCurrencyChange);
    return () =>
      window.removeEventListener("currency_change", handleCurrencyChange);
  }, []);

  // Filter Sales Based on Date Range Selection
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    return rawSales.filter((s) => {
      const saleDate = s.createdAt
        ? new Date(s.createdAt)
        : s.date
          ? new Date(s.date)
          : new Date();

      if (dateRange === "today") {
        return saleDate >= startOfToday;
      }
      if (dateRange === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return saleDate >= weekAgo;
      }
      if (dateRange === "month") {
        return (
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
        );
      }
      if (dateRange === "quarter") {
        const threeMonthsAgo = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate(),
        );
        return saleDate >= threeMonthsAgo;
      }
      if (dateRange === "year") {
        return saleDate.getFullYear() === now.getFullYear();
      }
      if (dateRange === "custom") {
        const start = customStartDate ? new Date(customStartDate) : new Date(0);
        const end = customEndDate
          ? new Date(customEndDate + "T23:59:59")
          : new Date();
        return saleDate >= start && saleDate <= end;
      }
      return true;
    });
  }, [rawSales, dateRange, customStartDate, customEndDate]);

  // Dynamic Metrics Derived from Filtered Sales
  const metrics = useMemo(() => {
    const totalRevNumber = filteredSales.reduce((acc, s) => {
      const val =
        Number(
          String(s.totalAmount || s.total || 0).replace(/[^0-9.-]+/g, ""),
        ) || 0;
      return acc + val;
    }, 0);

    const productsCount = Math.max(
      rawProducts.length,
      serverDashboardData?.stats?.productsCount || 0,
    );
    const customersCount = rawCustomers.length;
    const ordersCount = filteredSales.length;

    // MoM calculation
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    let thisMonthRev = 0;
    let lastMonthRev = 0;
    let thisMonthOrders = 0;
    let lastMonthOrders = 0;

    rawSales.forEach((s) => {
      const val =
        Number(
          String(s.totalAmount || s.total || 0).replace(/[^0-9.-]+/g, ""),
        ) || 0;
      const d = s.createdAt
        ? new Date(s.createdAt)
        : s.date
          ? new Date(s.date)
          : new Date();
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        thisMonthRev += val;
        thisMonthOrders += 1;
      } else if (
        d.getMonth() === prevMonth &&
        d.getFullYear() === prevMonthYear
      ) {
        lastMonthRev += val;
        lastMonthOrders += 1;
      }
    });

    const revenueGrowth =
      lastMonthRev > 0
        ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100)
        : thisMonthRev > 0
          ? 100
          : 0;
    const ordersGrowth =
      lastMonthOrders > 0
        ? Math.round(
            ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100,
          )
        : thisMonthOrders > 0
          ? 100
          : 0;

    // Revenue Monthly Chart Data
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyTotals: Record<number, number> = {};
    for (let i = 0; i < 12; i++) monthlyTotals[i] = 0;

    filteredSales.forEach((s) => {
      const val =
        Number(
          String(s.totalAmount || s.total || 0).replace(/[^0-9.-]+/g, ""),
        ) || 0;
      const d = s.createdAt
        ? new Date(s.createdAt)
        : s.date
          ? new Date(s.date)
          : new Date();
      const m = d.getMonth();
      if (m >= 0 && m < 12) monthlyTotals[m] += val;
    });

    const revenueData = monthNames.map((month, idx) => ({
      month,
      revenue: Math.round(monthlyTotals[idx] || 0),
    }));

    // Weekly Sales Chart Data
    const dayMapName: Record<number, string> = {
      0: "Sun",
      1: "Mon",
      2: "Tue",
      3: "Wed",
      4: "Thu",
      5: "Fri",
      6: "Sat",
    };
    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dailyTotals: Record<string, number> = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };

    filteredSales.forEach((s) => {
      const val =
        Number(
          String(s.totalAmount || s.total || 0).replace(/[^0-9.-]+/g, ""),
        ) || 0;
      const d = s.createdAt ? new Date(s.createdAt) : new Date();
      const dayName = dayMapName[d.getDay()];
      if (
        dayName &&
        Object.prototype.hasOwnProperty.call(dailyTotals, dayName)
      ) {
        dailyTotals[dayName] += val;
      }
    });

    const weeklySalesData = dayOrder.map((day) => ({
      day,
      sales: Math.round(dailyTotals[day] || 0),
    }));

    // Low Stock Products
    const lowStockProductsList =
      rawProducts.length > 0
        ? rawProducts
            .filter((p) => Number(p.stock || 0) <= Number(p.minStock || 15))
            .map((p, idx: number) => ({
              id: (p.id as string | number) || idx + 1,
              product: (p.name as string) || "Product",
              sku: (p.sku as string) || "N/A",
              current: Number(p.stock || 0),
              minimum: Number(p.minStock || 15),
              status: Number(p.stock || 0) === 0 ? "critical" : "warning",
            }))
        : serverDashboardData?.lowStockProducts || [];

    // Recent Sales
    const recentSalesList = filteredSales.slice(0, 5).map((s, idx) => ({
      id: String(s.dbId || s.id || idx + 1),
      customer: String(s.customer || "Walk-in Customer"),
      invoice: String(s.order || s.orderNumber || `SO-${s.id}`),
      amount: formatPrice(String(s.totalAmount || s.total || 0)),
      status: String(s.payment || s.paymentStatus || "pending").toLowerCase(),
      date: String(s.date || "Today"),
    }));

    return {
      totalRevenue: formatPrice(totalRevNumber),
      ordersCount,
      productsCount,
      customersCount,
      revenueGrowth,
      ordersGrowth,
      revenueData,
      weeklySalesData,
      lowStockProductsList,
      recentSalesList,
    };
  }, [filteredSales, rawProducts, rawCustomers, rawSales, serverDashboardData]);

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case "today":
        return "Today";
      case "week":
        return "Last 7 Days";
      case "month":
        return "This Month (Default)";
      case "quarter":
        return "This Quarter (3 Months)";
      case "year":
        return "This Year";
      case "custom":
        return "Custom Range";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/Login");
  };

  return (
    <div
      className={`flex h-screen w-full transition-colors duration-200 ${isDark ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}
    >
      <Sidebar sidebarOpen={sidebarOpen} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDark={isDark}
          setIsDark={setIsDark}
          onRefresh={loadRealtimeDashboard}
          isLoading={isLoading}
        />

        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Dashboard Header with Dynamic Date Range Picker */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  Dashboard Operasional
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Summary of business metrics, point-of-sale transactions, and
                  real-time revenue analytics.
                </p>
              </div>

              {/* Feature B1: Date Range Filter Dropdown & Custom Inputs */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span>Filter: {getDateRangeLabel()}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isDateDropdownOpen && (
                    <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 p-1.5 space-y-0.5">
                      {[
                        { id: "today", label: "Hari Ini" },
                        { id: "week", label: "7 Hari Terakhir" },
                        { id: "month", label: "Bulan Ini" },
                        { id: "quarter", label: "Kuartal (3 Bulan)" },
                        { id: "year", label: "Tahun Ini" },
                        { id: "custom", label: "Rentang Kustom..." },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setDateRange(item.id as DateRangeType);
                            if (item.id !== "custom")
                              setIsDateDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                            dateRange === item.id
                              ? "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 font-bold"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          <span>{item.label}</span>
                          {dateRange === item.id && (
                            <Check className="w-3.5 h-3.5 text-sky-600" />
                          )}
                        </button>
                      ))}

                      {dateRange === "custom" && (
                        <div className="p-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              Dari:
                            </span>
                            <Input
                              type="date"
                              value={customStartDate}
                              onChange={(e) =>
                                setCustomStartDate(e.target.value)
                              }
                              className="h-7 text-[11px] rounded-lg"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              Sampai:
                            </span>
                            <Input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="h-7 text-[11px] rounded-lg"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setIsDateDropdownOpen(false)}
                            className="w-full h-7 text-xs bg-sky-600 text-white rounded-lg cursor-pointer"
                          >
                            Terapkan
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* <Button
                  onClick={() => router.push('/POS')}
                  className="bg-sky-600 hover:bg-sky-700 text-white text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Buka Kasir POS
                </Button> */}
              </div>
            </div>

            {/* Quick Actions Header Strip */}
            <div className="flex flex-wrap gap-2.5">
              <Button
                onClick={() => router.push("/Products")}
                variant="outline"
                size="sm"
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs rounded-xl cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5 text-sky-600" /> Tambah
                Produk
              </Button>
              <Button
                onClick={() => router.push("/Sales")}
                variant="outline"
                size="sm"
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs rounded-xl cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />{" "}
                Buat Sales Order
              </Button>
              <Button
                onClick={() => router.push("/AI-Insights")}
                variant="outline"
                size="sm"
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs rounded-xl cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Scan
                Struk OCR
              </Button>
              <Button
                onClick={() => router.push("/ReportsPage")}
                variant="outline"
                size="sm"
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs rounded-xl cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5 text-purple-600" />{" "}
                Laporan Finansial
              </Button>
            </div>

            {/* KPI Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-slate-500">
                      Total Pendapatan
                    </CardTitle>
                    <div className="p-2 bg-sky-50 dark:bg-sky-950/60 rounded-xl text-sky-600">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {metrics.totalRevenue}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {metrics.revenueGrowth >= 0 ? (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center">
                        <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +
                        {metrics.revenueGrowth}%
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-rose-600 flex items-center">
                        <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />{" "}
                        {metrics.revenueGrowth}%
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      vs periode lalu
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Orders */}
              <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-slate-500">
                      Jumlah Transaksi
                    </CardTitle>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {metrics.ordersCount}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {metrics.ordersGrowth >= 0 ? (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center">
                        <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +
                        {metrics.ordersGrowth}%
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-rose-600 flex items-center">
                        <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />{" "}
                        {metrics.ordersGrowth}%
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      pesanan selesai
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Products */}
              <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-slate-500">
                      Katalog Produk
                    </CardTitle>
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {metrics.productsCount}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Produk terdaftar di database
                  </div>
                </CardContent>
              </Card>

              {/* Customers */}
              <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-slate-500">
                      Pelanggan Aktif
                    </CardTitle>
                    <div className="p-2 bg-purple-50 dark:bg-purple-950/60 rounded-xl text-purple-600">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {metrics.customersCount}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Member CRM terhubung
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Line Chart */}
              <Card className="lg:col-span-2 rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">
                      Tren Pendapatan Penjualan
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Revenue chart based on active time filters (
                      {getDateRangeLabel()})
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics.revenueData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f1f5f9"
                          className="dark:stroke-slate-700"
                        />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "none",
                            borderRadius: "12px",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                          formatter={(v: any) => [
                            `$${Number(v).toLocaleString()}`,
                            "Revenue",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#0284c7"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#0284c7" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Sales Bar Chart */}
              <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold">
                    Aktivitas Penjualan Mingguan
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Daily sales volume over 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.weeklySalesData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f1f5f9"
                          className="dark:stroke-slate-700"
                        />
                        <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "none",
                            borderRadius: "12px",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                          formatter={(v: any) => [
                            `$${Number(v).toLocaleString()}`,
                            "Sales",
                          ]}
                        />
                        <Bar
                          dataKey="sales"
                          fill="#6366f1"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Sales Orders */}
              <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">
                      Transaksi Penjualan Terbaru
                    </CardTitle>
                    <CardDescription className="text-xs">
                      List of latest POS orders and sales orders
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => router.push("/Sales")}
                    variant="ghost"
                    size="sm"
                    className="text-sky-600 text-xs"
                  >
                    Lihat Semua →
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {metrics.recentSalesList.length > 0 ? (
                      metrics.recentSalesList.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800"
                        >
                          <div>
                            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                              {s.customer}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {s.invoice} • {s.date}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {s.amount}
                            </div>
                            <Badge
                              className={`text-[10px] uppercase font-bold mt-0.5 ${
                                s.status.includes("paid")
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              }`}
                            >
                              {s.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">
                        Belum ada transaksi pada rentang waktu ini.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Low Stock Alert */}
              <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">
                      Peringatan Stok Menipis
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Products approaching the minimum stock level
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => router.push("/ProductInventory")}
                    variant="ghost"
                    size="sm"
                    className="text-sky-600 text-xs"
                  >
                    Kelola Stok →
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {metrics.lowStockProductsList.length > 0 ? (
                      metrics.lowStockProductsList
                        .slice(0, 5)
                        .map((p: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800"
                          >
                            <div>
                              <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                {p.product}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                SKU: {p.sku}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-xs text-rose-600">
                                Sisa: {p.current} pcs
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Min: {p.minimum} pcs
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">
                        Seluruh stok produk berada dalam batas aman.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE B2: QUICK ACTION SPEED-DIAL FLOATING BUTTON (FAB)                  */}
      {/* ========================================================================= */}
      {/* <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isSpeedDialOpen && (
          <div className="flex flex-col gap-2.5 mb-3 items-end animate-in fade-in slide-in-from-bottom-4 duration-200">
            <button
              onClick={() => router.push('/POS')}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer font-semibold text-xs group"
            >
              <span>Buka Kasir POS Terminal</span>
              <div className="p-1 bg-white/20 rounded-lg"><ShoppingCart className="w-4 h-4" /></div>
            </button>

            <button
              onClick={() => router.push('/AI-Insights')}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer font-semibold text-xs group"
            >
              <span>Scan Struk AI OCR</span>
              <div className="p-1 bg-white/20 rounded-lg"><Camera className="w-4 h-4" /></div>
            </button>

            <button
              onClick={() => router.push('/Products')}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer font-semibold text-xs group"
            >
              <span>Tambah Produk Baru</span>
              <div className="p-1 bg-white/20 rounded-lg"><Package className="w-4 h-4" /></div>
            </button>

            <button
              onClick={() => router.push('/Sales')}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer font-semibold text-xs group"
            >
              <span>Buat Sales Order Baru</span>
              <div className="p-1 bg-white/20 rounded-lg"><FileText className="w-4 h-4" /></div>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsSpeedDialOpen(!isSpeedDialOpen)}
          className={`h-14 w-14 rounded-2xl shadow-xl flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${
            isSpeedDialOpen ? 'bg-rose-600 rotate-45' : 'bg-linear-to-tr from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sky-500/25'
          }`}
          title="Aksi Cepat (Speed Dial)"
        >
          <Plus className="w-7 h-7 transition-transform" />
        </button>
      </div> */}
    </div>
  );
};

export default Dashboard;
