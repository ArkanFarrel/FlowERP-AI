/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/layout/sidebar";
import Topbar from "@/components/ui/layout/topbar";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  CreditCard,
  QrCode,
  Banknote,
  Building,
  Printer,
  RefreshCw,
  Package,
  AlertCircle,
  PauseCircle,
  Clock,
  Wifi,
  WifiOff,
  Coins,
  UserCheck,
  Percent,
  Check,
  ChevronDown,
  Globe,
  Sliders,
  DollarSign
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { getInventory } from "@/app/actions/inventory";
import { createPOSCheckoutOrder } from "@/app/actions/sales";
import { getCustomers } from "@/app/actions/customers";
import {
  formatPrice,
  getSelectedCurrency,
  getCurrencyPresets,
  CURRENCY_OPTIONS,
  syncLiveExchangeRates
} from "@/lib/currency";
import { toast } from "sonner";

interface ProductItem {
  id: string;
  dbId?: string;
  product: string;
  sku: string;
  category: string;
  warehouse: string;
  stock: number;
  unitPrice: number;
  status: string;
}

interface CartItem {
  id: string;
  product: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  stockAvailable: number;
}

interface CustomerOption {
  id: string;
  dbId: string;
  name: string;
  company: string;
  phone: string;
  loyaltyPoints: number;
}

interface CompletedReceipt {
  orderNumber: string;
  date: string;
  customerName: string;
  customerId?: string;
  paymentMethod: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  loyaltyDiscount: number;
  pointsRedeemed: number;
  pointsEarned: number;
  tax: number;
  total: number;
  cashTendered: number;
  changeAmount: number;
  currency: string;
  isOffline?: boolean;
}

interface ShiftTransaction {
  orderNumber: string;
  total: number;
  paymentMethod: string;
  time: string;
}

interface ShiftData {
  kasir: string;
  modalAwal: number;
  startTime: string;
  notes: string;
  transactions: ShiftTransaction[];
}

interface HeldOrder {
  holdId: string;
  customerName: string;
  customerId?: string;
  cart: CartItem[];
  discountPercent: number;
  pointsRedeemed: number;
  timestamp: string;
}

export default function POSTerminalPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Currency State (4 Formats: USD, IDR, EUR, SGD)
  const [activeCurrency, setActiveCurrency] = useState<string>("USD");

  // Offline-First PWA
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // Shift Management
  const [activeShift, setActiveShift] = useState<ShiftData | null>(null);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  const [shiftKasir, setShiftKasir] = useState("");
  const [shiftModal, setShiftModal] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");

  // Held Orders
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState(false);

  // Products & Inventory Data (0ms instant cache load)
  const [products, setProducts] = useState<ProductItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem('flowerp_products_cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(() => {
    if (typeof window !== "undefined" && localStorage.getItem('flowerp_products_cache')) {
      return false;
    }
    return true;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Customer & Loyalty Points State
  const [customers, setCustomers] = useState<CustomerOption[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem('flowerp_customers_cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Cart & Transaction State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "QRIS" | "Card" | "Transfer">("Cash");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxEnabled, setTaxEnabled] = useState<boolean>(true);
  const [cashTenderedInput, setCashTenderedInput] = useState<string>("");

  // Thermal Printing Options (58mm vs 80mm)
  const [receiptPaperWidth, setReceiptPaperWidth] = useState<"80mm" | "58mm">("80mm");
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<CompletedReceipt | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Sync currency from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = getSelectedCurrency();
      setActiveCurrency(cur);

      const handleCurChange = () => {
        setActiveCurrency(getSelectedCurrency());
      };
      window.addEventListener("currency_change", handleCurChange);
      return () => window.removeEventListener("currency_change", handleCurChange);
    }
  }, []);

  const handleCurrencyChange = (newCode: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("currency", newCode);
      setActiveCurrency(newCode);
      window.dispatchEvent(new Event("currency_change"));
      toast.success(`Mata uang kasir disetel ke ${newCode}`);
    }
  };

  // Fetch Customers for Member Loyalty
  const fetchCustomerList = async () => {
    try {
      const res = await getCustomers();
      if (res.success && res.data) {
        const list: CustomerOption[] = res.data.map((c: any) => ({
          id: c.id,
          dbId: c.dbId || c.id,
          name: c.name,
          company: c.company,
          phone: c.phone,
          loyaltyPoints: c.loyaltyPoints || 0,
        }));
        setCustomers(list);
        if (typeof window !== "undefined") {
          localStorage.setItem('flowerp_customers_cache', JSON.stringify(list));
        }
      }
    } catch (e) {
      console.error("Failed to load customer loyalty list", e);
    }
  };

  // Process Offline Queue
  const processOfflineQueue = async () => {
    try {
      const queueRaw = localStorage.getItem('flowerp_offline_queue');
      if (!queueRaw) return;
      const q = JSON.parse(queueRaw);
      if (!Array.isArray(q) || q.length === 0) return;
      
      let processed = 0;
      for (const order of q) {
        try {
          const res = await createPOSCheckoutOrder(order);
          if (res && res.success) processed++;
        } catch (e) {
          console.error("Failed to sync offline order", e);
        }
      }
      
      if (processed === q.length) {
        localStorage.removeItem('flowerp_offline_queue');
        setOfflineQueueCount(0);
        toast.success(`Berhasil menyinkronkan ${processed} pesanan offline!`);
      } else {
        const remaining = q.slice(processed);
        localStorage.setItem('flowerp_offline_queue', JSON.stringify(remaining));
        setOfflineQueueCount(remaining.length);
        toast.info(`Tersinkron ${processed} pesanan, sisa ${remaining.length}.`);
      }
    } catch (err) {
      console.error("Error processing offline queue", err);
    }
  };

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const goOnline = () => { 
      setIsOnline(true); 
      processOfflineQueue(); 
    };
    const goOffline = () => setIsOnline(false);
    
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    
    const q = JSON.parse(localStorage.getItem('flowerp_offline_queue') || '[]');
    setOfflineQueueCount(q.length);

    // Fast non-blocking background fetch
    syncLiveExchangeRates();
    Promise.allSettled([
      fetchProducts(),
      fetchCustomerList(),
      processOfflineQueue(),
    ]);
    
    // Shift Data
    const storedShift = localStorage.getItem('flowerp_active_shift');
    if (storedShift) {
      try {
        setActiveShift(JSON.parse(storedShift));
      } catch (e) {
        setIsOpenShiftModalOpen(true);
      }
    } else {
      setIsOpenShiftModalOpen(true);
    }

    // Held Orders
    const storedHeld = localStorage.getItem('flowerp_held_orders');
    if (storedHeld) {
      try {
        setHeldOrders(JSON.parse(storedHeld));
      } catch (e) {
        setHeldOrders([]);
      }
    }

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await getInventory();
      if (res.success && res.data) {
        const mapped: ProductItem[] = res.data.map((p) => ({
          id: p.id,
          dbId: p.id,
          product: p.product,
          sku: p.sku,
          category: p.category,
          warehouse: p.warehouse,
          stock: p.stock,
          unitPrice: parseFloat(String(p.price).replace(/[^0-9.-]+/g, "")) || 0,
          status: p.status,
        }));
        setProducts(mapped);
        if (typeof window !== "undefined") {
          localStorage.setItem('flowerp_products_cache', JSON.stringify(mapped));
        }
      }
    } catch (e) {
      console.error("fetchProducts error:", e);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Shift Actions
  const handleOpenShift = () => {
    if (!shiftKasir.trim() || !shiftModal) return;
    const newShift: ShiftData = {
      kasir: shiftKasir,
      modalAwal: parseFloat(shiftModal) || 0,
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: shiftNotes,
      transactions: [],
    };
    setActiveShift(newShift);
    localStorage.setItem('flowerp_active_shift', JSON.stringify(newShift));
    setIsOpenShiftModalOpen(false);
    toast.success(`Shift berhasil dibuka untuk kasir ${shiftKasir}`);
  };

  const handleCloseShift = () => {
    localStorage.removeItem('flowerp_active_shift');
    setActiveShift(null);
    setIsZReportOpen(false);
    toast.info("Shift kasir telah ditutup (Z-Report selesai).");
  };

  // Cart Operations
  const handleAddToCart = (product: ProductItem) => {
    if (product.stock <= 0) {
      toast.error(`Stok ${product.product} habis!`);
      return;
    }
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.warning(`Maksimal stok tersedia (${product.stock}) telah dicapai.`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prevCart,
        {
          id: product.id,
          product: product.product,
          sku: product.sku,
          unitPrice: product.unitPrice,
          quantity: 1,
          stockAvailable: product.stock,
        },
      ];
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            if (nextQty > item.stockAvailable) {
              toast.warning(`Stok hanya tersedia ${item.stockAvailable}`);
              return item;
            }
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCart([]);
    setCashTenderedInput("");
    setPointsToRedeem(0);
    setUseLoyaltyPoints(false);
  };

  // Hold Order Feature
  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    if (heldOrders.length >= 5) {
      toast.error("Maksimal 5 antrean pesanan yang ditahan.");
      return;
    }
    const newHold: HeldOrder = {
      holdId: `HOLD-${Date.now().toString().slice(-4)}`,
      customerName: selectedCustomer ? selectedCustomer.name : "Walk-in Customer",
      customerId: selectedCustomer?.id,
      cart: [...cart],
      discountPercent,
      pointsRedeemed: pointsToRedeem,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [newHold, ...heldOrders];
    setHeldOrders(updated);
    localStorage.setItem('flowerp_held_orders', JSON.stringify(updated));
    handleClearCart();
    toast.success(`Pesanan #${newHold.holdId} berhasil ditahan sementara.`);
  };

  const handleRecallOrder = (hold: HeldOrder) => {
    setCart(hold.cart);
    setDiscountPercent(hold.discountPercent);
    if (hold.customerId) {
      const match = customers.find(c => c.id === hold.customerId);
      if (match) setSelectedCustomer(match);
    }
    if (hold.pointsRedeemed > 0) {
      setUseLoyaltyPoints(true);
      setPointsToRedeem(hold.pointsRedeemed);
    }
    const updated = heldOrders.filter((h) => h.holdId !== hold.holdId);
    setHeldOrders(updated);
    localStorage.setItem('flowerp_held_orders', JSON.stringify(updated));
    setIsHeldOrdersOpen(false);
    toast.success(`Pesanan #${hold.holdId} berhasil dimuat kembali ke kasir.`);
  };

  // Categories
  const categories = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ["All", ...list];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Financial Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return subtotal * (discountPercent / 100);
  }, [subtotal, discountPercent]);

  // Loyalty Points Discount (1 Point = $1 Base Currency equivalent)
  const maxAvailablePoints = selectedCustomer ? selectedCustomer.loyaltyPoints : 0;
  const loyaltyDiscount = useMemo(() => {
    if (!useLoyaltyPoints || !selectedCustomer) return 0;
    const cappedPoints = Math.min(pointsToRedeem, maxAvailablePoints, Math.floor(subtotal - discountAmount));
    return Math.max(0, cappedPoints);
  }, [useLoyaltyPoints, selectedCustomer, pointsToRedeem, maxAvailablePoints, subtotal, discountAmount]);

  const taxableAmount = Math.max(0, subtotal - discountAmount - loyaltyDiscount);
  const taxAmount = useMemo(() => {
    return taxEnabled ? taxableAmount * 0.11 : 0;
  }, [taxableAmount, taxEnabled]);

  const grandTotal = useMemo(() => {
    return Math.max(0, taxableAmount + taxAmount);
  }, [taxableAmount, taxAmount]);

  // Points that will be earned from this transaction
  const pointsEarned = useMemo(() => {
    return selectedCustomer ? Math.max(1, Math.floor(grandTotal / 10)) : 0;
  }, [selectedCustomer, grandTotal]);

  const cashTenderedVal = parseFloat(cashTenderedInput) || 0;
  const changeAmount = paymentMethod === "Cash" ? Math.max(0, cashTenderedVal - grandTotal) : 0;
  const canCheckout = cart.length > 0 && (paymentMethod !== "Cash" || cashTenderedVal >= grandTotal);

  // Dynamic Cash Presets based on Active Currency
  const dynamicPresets = useMemo(() => {
    return getCurrencyPresets(activeCurrency);
  }, [activeCurrency]);

  // Checkout Execution
  const handleProcessCheckout = async () => {
    if (!canCheckout || isProcessingCheckout) return;

    if (!activeShift) {
      setIsOpenShiftModalOpen(true);
      toast.warning("Silakan buka shift kasir terlebih dahulu untuk memproses transaksi.");
      return;
    }

    setIsProcessingCheckout(true);
    const orderNo = `POS-${Date.now().toString().slice(-6)}`;
    const custName = selectedCustomer ? selectedCustomer.name : "Walk-in Customer";

    const payload = {
      orderNumber: orderNo,
      customerName: custName,
      customerId: selectedCustomer?.id,
      paymentMethod,
      subtotal,
      discount: discountAmount,
      loyaltyDiscount,
      pointsRedeemed: useLoyaltyPoints ? pointsToRedeem : 0,
      pointsEarned,
      tax: taxAmount,
      totalAmount: grandTotal,
      cashTendered: paymentMethod === "Cash" ? cashTenderedVal : grandTotal,
      changeAmount: paymentMethod === "Cash" ? changeAmount : 0,
      items: cart.map((i) => ({
        productId: i.id,
        productName: i.product,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.unitPrice * i.quantity,
      })),
    };

    const receiptData: CompletedReceipt = {
      orderNumber: orderNo,
      date: new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
      customerName: custName,
      customerId: selectedCustomer?.id,
      paymentMethod,
      items: [...cart],
      subtotal,
      discount: discountAmount,
      loyaltyDiscount,
      pointsRedeemed: useLoyaltyPoints ? pointsToRedeem : 0,
      pointsEarned,
      tax: taxAmount,
      total: grandTotal,
      cashTendered: paymentMethod === "Cash" ? cashTenderedVal : grandTotal,
      changeAmount,
      currency: activeCurrency,
      isOffline: !isOnline,
    };

    if (isOnline) {
      try {
        const res = await createPOSCheckoutOrder(payload);
        if (res.success) {
          toast.success(`Transaksi ${orderNo} berhasil diselesaikan!`);
        } else {
          toast.error(res.error || "Gagal mencatat transaksi kasir.");
        }
      } catch (err) {
        console.warn("Online checkout failed, caching locally:", err);
        const queue = JSON.parse(localStorage.getItem("flowerp_offline_queue") || "[]");
        queue.push(payload);
        localStorage.setItem("flowerp_offline_queue", JSON.stringify(queue));
        setOfflineQueueCount(queue.length);
        toast.info("Transaksi disimpan di antrean offline lokal.");
      }
    } else {
      const queue = JSON.parse(localStorage.getItem("flowerp_offline_queue") || "[]");
      queue.push(payload);
      localStorage.setItem("flowerp_offline_queue", JSON.stringify(queue));
      setOfflineQueueCount(queue.length);
      toast.info("Mode Offline: Transaksi tersimpan dan akan disinkronkan saat online.");
    }

    // Deduct local product stock for immediate UI update
    setProducts((prev) =>
      prev.map((p) => {
        const cartMatch = cart.find((c) => c.id === p.id);
        if (cartMatch) {
          return { ...p, stock: Math.max(0, p.stock - cartMatch.quantity) };
        }
        return p;
      })
    );

    // Update active shift transactions log
    if (activeShift) {
      const updatedShift: ShiftData = {
        ...activeShift,
        transactions: [
          ...activeShift.transactions,
          {
            orderNumber: orderNo,
            total: grandTotal,
            paymentMethod,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ],
      };
      setActiveShift(updatedShift);
      localStorage.setItem("flowerp_active_shift", JSON.stringify(updatedShift));
    }

    // Refresh customer loyalty points list
    if (selectedCustomer) {
      fetchCustomerList();
    }

    setCompletedReceipt(receiptData);
    setIsReceiptModalOpen(true);
    handleClearCart();
    setIsProcessingCheckout(false);
  };

  // Direct Thermal Printing Action (58mm / 80mm)
  const handlePrintThermal = () => {
    if (typeof document !== "undefined") {
      document.body.classList.add("printing-receipt");
      window.print();
      setTimeout(() => {
        document.body.classList.remove("printing-receipt");
      }, 500);
    }
  };

  const totalShiftSales = activeShift
    ? activeShift.transactions.reduce((sum, t) => sum + t.total, 0)
    : 0;

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDark ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDark={isDark}
          setIsDark={setIsDark}
          onRefresh={fetchProducts}
          isLoading={isLoadingProducts}
          searchPlaceholder="Cari produk di kasir..."
        />

        {/* Shift Notification Bar */}
        {activeShift ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 px-6 py-2 flex items-center justify-between">
            <div className="text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Shift Aktif • <strong className="font-bold">{activeShift.kasir}</strong> • Mulai: {activeShift.startTime} • Modal: {formatPrice(activeShift.modalAwal)}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick Currency Selector */}
              <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-emerald-200 dark:border-emerald-800">
                {CURRENCY_OPTIONS.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => handleCurrencyChange(c.code)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                      activeCurrency === c.code
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-emerald-600"
                    }`}
                  >
                    {c.symbol} {c.code}
                  </button>
                ))}
              </div>

              <Button onClick={() => setIsZReportOpen(true)} variant="outline" size="sm" className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-7 text-xs cursor-pointer">
                Tutup Shift (Z-Report)
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Shift belum dibuka — Anda dalam mode peninjauan katalog. Buka shift untuk memproses pembayaran kasir.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push("/Dashboard")}
                variant="ghost"
                size="sm"
                className="text-slate-600 dark:text-slate-300 text-xs h-7 cursor-pointer"
              >
                ← Dashboard
              </Button>
              <Button onClick={() => setIsOpenShiftModalOpen(true)} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs cursor-pointer">
                Buka Shift Sekarang
              </Button>
            </div>
          </div>
        )}

        {/* POS Body Grid */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT: Product Catalog Panel */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-950">
            
            {/* Search & Category Pills */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Cari produk berdasarkan nama atau scan barcode SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-50 dark:bg-slate-800 rounded-xl"
                  />
                </div>
                {heldOrders.length > 0 && (
                  <Button
                    onClick={() => setIsHeldOrdersOpen(true)}
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 rounded-xl cursor-pointer"
                  >
                    <PauseCircle className="h-4 w-4 mr-1.5" />
                    <span>Antrean ({heldOrders.length})</span>
                  </Button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-sky-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingProducts ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-sky-600" />
                  <span className="text-sm">Memuat katalog produk POS...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center">
                  <Package className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Produk tidak ditemukan</p>
                  <p className="text-xs text-slate-500">Coba ganti kata kunci atau kategori pencarian.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredProducts.map((p) => {
                    const isOutOfStock = p.stock <= 0;
                    return (
                      <div
                        key={p.id}
                        onClick={() => !isOutOfStock && handleAddToCart(p)}
                        className={`group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-sky-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 cursor-pointer ${
                          isOutOfStock ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {p.category}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isOutOfStock
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  : p.stock <= 5
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {isOutOfStock ? "Habis" : `${p.stock} pcs`}
                            </span>
                          </div>
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                            {p.product}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            SKU: {p.sku}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-xs sm:text-sm font-black text-sky-600 dark:text-sky-400">
                            {formatPrice(p.unitPrice)}
                          </span>
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                              isOutOfStock
                                ? "bg-slate-200 text-slate-400"
                                : "bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white dark:bg-sky-950 dark:text-sky-400"
                            }`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Cart & Member Checkout Panel */}
          <div className="w-full lg:w-105 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-hidden">
            
            {/* Cart Header with Customer & Loyalty Selector */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-sky-600" />
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                    Keranjang Belanja ({cart.reduce((a, b) => a + b.quantity, 0)})
                  </h2>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleHoldOrder}
                    disabled={cart.length === 0}
                    className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                    title="Tahan Pesanan (Hold)"
                  >
                    <PauseCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearCart}
                    disabled={cart.length === 0}
                    className="text-rose-600 hover:text-rose-700 text-xs hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 cursor-pointer"
                  >
                    Kosongkan
                  </Button>
                </div>
              </div>

              {/* Customer Selector with Loyalty Points */}
              <div className="relative">
                <div
                  onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <UserCheck className="h-4 w-4 text-sky-600 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {selectedCustomer ? selectedCustomer.name : "Walk-in Customer (Umum)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedCustomer && (
                      <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 text-[10px]">
                        <Coins className="w-3 h-3 mr-1" /> {selectedCustomer.loyaltyPoints} Pts
                      </Badge>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                {isCustomerDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-2 space-y-1 max-h-56 overflow-y-auto">
                    <Input
                      placeholder="Cari nama member..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="h-8 text-xs mb-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setUseLoyaltyPoints(false);
                        setPointsToRedeem(0);
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center justify-between"
                    >
                      <span>Walk-in Customer (Umum)</span>
                      {!selectedCustomer && <Check className="w-3.5 h-3.5 text-sky-600" />}
                    </button>
                    {customers
                      .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                      .map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setIsCustomerDropdownOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-lg text-xs hover:bg-sky-50 dark:hover:bg-sky-950/40 font-medium flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{cust.name}</div>
                            <div className="text-[10px] text-slate-400">{cust.phone || cust.company}</div>
                          </div>
                          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-[10px]">
                            {cust.loyaltyPoints} Pts
                          </Badge>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Loyalty Points Redemption Box */}
              {selectedCustomer && selectedCustomer.loyaltyPoints > 0 && (
                <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useLoyaltyPoints}
                        onChange={(e) => {
                          setUseLoyaltyPoints(e.target.checked);
                          if (e.target.checked) {
                            setPointsToRedeem(Math.min(selectedCustomer.loyaltyPoints, Math.floor(subtotal)));
                          } else {
                            setPointsToRedeem(0);
                          }
                        }}
                        className="rounded text-indigo-600"
                      />
                      <span>Tukarkan Poin Loyalty Member</span>
                    </label>
                    <span className="text-[11px] font-bold text-indigo-600">
                      Tersedia: {selectedCustomer.loyaltyPoints} Pts
                    </span>
                  </div>

                  {useLoyaltyPoints && (
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        type="number"
                        min={0}
                        max={selectedCustomer.loyaltyPoints}
                        value={pointsToRedeem}
                        onChange={(e) => setPointsToRedeem(Math.min(selectedCustomer.loyaltyPoints, parseInt(e.target.value, 10) || 0))}
                        className="h-8 text-xs font-bold text-indigo-700 rounded-lg bg-white dark:bg-slate-900"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setPointsToRedeem(Math.min(selectedCustomer.loyaltyPoints, Math.floor(subtotal)))}
                        className="h-8 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg whitespace-nowrap cursor-pointer"
                      >
                        Pakai Maksimal
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                  <ShoppingCart className="h-10 w-10 mb-2 opacity-30 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Keranjang Masih Kosong
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Klik produk di katalog untuk menambahkan ke pesanan kasir.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.product}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatPrice(item.unitPrice)} × {item.quantity} ={" "}
                        <strong className="text-slate-900 dark:text-white font-bold">
                          {formatPrice(item.unitPrice * item.quantity)}
                        </strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>

                      <span className="w-5 text-center text-xs font-bold text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        disabled={item.quantity >= item.stockAvailable}
                        className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-400 ml-1 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment & Summary Section */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3">
              {/* Payment Methods */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "Cash" as const, label: "Cash", icon: Banknote },
                  { id: "QRIS" as const, label: "QRIS", icon: QrCode },
                  { id: "Card" as const, label: "Card", icon: CreditCard },
                  { id: "Transfer" as const, label: "Bank", icon: Building },
                ].map((m) => {
                  const Icon = m.icon;
                  const isActive = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                        isActive
                          ? "bg-sky-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1" />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {/* Cash Input with Dynamic Currency Presets */}
              {paymentMethod === "Cash" && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Uang Diterima ({activeCurrency}):
                    </span>
                    {cashTenderedVal > 0 && cashTenderedVal < grandTotal && (
                      <span className="text-rose-600 font-semibold flex items-center gap-1 text-[11px]">
                        <AlertCircle className="h-3.5 w-3.5" /> Kurang dari total
                      </span>
                    )}
                  </div>
                  <Input
                    type="number"
                    placeholder={`Masukkan nominal uang tunai...`}
                    value={cashTenderedInput}
                    onChange={(e) => setCashTenderedInput(e.target.value)}
                    className="h-9 text-sm font-bold text-sky-600 rounded-xl"
                  />
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                    <button
                      type="button"
                      onClick={() => setCashTenderedInput(String(grandTotal))}
                      className="px-2 py-1 bg-sky-50 text-sky-700 rounded-lg text-[11px] font-semibold hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300 whitespace-nowrap cursor-pointer"
                    >
                      Uang Pas
                    </button>
                    {dynamicPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCashTenderedInput(String(preset))}
                        className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap cursor-pointer"
                      >
                        {formatPrice(preset)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Line Totals Summary */}
              <div className="space-y-1 text-xs border-t border-slate-100 dark:border-slate-800 pt-2">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-indigo-600 font-semibold">
                    <span>Diskon Poin Member ({pointsToRedeem} Pts)</span>
                    <span>-{formatPrice(loyaltyDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Pajak (PPN 11%)</span>
                  <span>{formatPrice(taxAmount)}</span>
                </div>

                {paymentMethod === "Cash" && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Kembalian</span>
                    <span>{formatPrice(changeAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-800">
                  <span>TOTAL PEMBAYARAN:</span>
                  <span className="text-sky-600 dark:text-sky-400 text-base">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Complete POS Transaction Button */}
              <Button
                onClick={handleProcessCheckout}
                disabled={!canCheckout || isProcessingCheckout}
                className={`w-full h-11 rounded-xl font-bold text-sm transition cursor-pointer shadow-md disabled:opacity-50 ${
                  !activeShift ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-sky-600 hover:bg-sky-700 text-white"
                }`}
              >
                {isProcessingCheckout ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Memproses Transaksi...
                  </div>
                ) : !activeShift ? (
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Buka Shift untuk Selesaikan Transaksi
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Selesaikan Transaksi Kasir
                  </div>
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* Feature A: Buka Shift Modal */}
      <Dialog open={isOpenShiftModalOpen} onOpenChange={setIsOpenShiftModalOpen}>
        <DialogContent className="sm:max-w-112.5 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Buka Shift Kasir Baru</DialogTitle>
            <DialogDescription>
              Silakan isi data kasir dan modal awal untuk memulai transaksi penjualan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Nama Kasir / Petugas</label>
              <Input value={shiftKasir} onChange={e => setShiftKasir(e.target.value)} placeholder="Nama kasir yang bertugas..." className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Modal Awal Laci Kasir ({activeCurrency})</label>
              <Input type="number" value={shiftModal} onChange={e => setShiftModal(e.target.value)} placeholder={activeCurrency === "IDR" ? "500000" : "100"} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Catatan Shift (Opsional)</label>
              <Input value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} placeholder="Catatan operasional shift..." className="rounded-xl" />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between items-center">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/Dashboard")}
                className="text-slate-600 dark:text-slate-400 text-xs cursor-pointer h-9 px-3"
              >
                ← Dashboard
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpenShiftModalOpen(false)}
                className="text-xs cursor-pointer h-9 px-3"
              >
                Nanti Saja
              </Button>
            </div>
            <Button
              type="button"
              onClick={handleOpenShift}
              disabled={!shiftKasir || !shiftModal}
              className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer h-9 px-4 rounded-xl"
            >
              Buka Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature A: Z-Report (Tutup Shift) Modal */}
      <Dialog open={isZReportOpen} onOpenChange={setIsZReportOpen}>
        <DialogContent className="sm:max-w-106.25 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Z-Report (Ringkasan Tutup Shift)</DialogTitle>
            <DialogDescription>
              Ringkasan total penerimaan transaksi selama shift kasir aktif.
            </DialogDescription>
          </DialogHeader>
          {activeShift && (
            <div className="grid gap-3 py-4 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Kasir:</span>
                <span className="font-semibold">{activeShift.kasir}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Mulai Shift:</span>
                <span className="font-semibold">{activeShift.startTime}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Modal Awal:</span>
                <span className="font-semibold">{formatPrice(activeShift.modalAwal)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Total Transaksi:</span>
                <span className="font-semibold">{activeShift.transactions.length} orders</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Total Penjualan Shift:</span>
                <span className="font-semibold text-emerald-600">{formatPrice(totalShiftSales)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2">
                <span>Estimasi Kas Laci:</span>
                <span className="text-sky-600">{formatPrice(activeShift.modalAwal + totalShiftSales)}</span>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsZReportOpen(false)} className="flex-1 cursor-pointer">
              Batal
            </Button>
            <Button onClick={handleCloseShift} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer">
              Konfirmasi Tutup Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature B: Held Orders Modal */}
      <Dialog open={isHeldOrdersOpen} onOpenChange={setIsHeldOrdersOpen}>
        <DialogContent className="sm:max-w-125 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Daftar Pesanan Ditahan (Hold Orders)</DialogTitle>
            <DialogDescription>
              Pilih pesanan yang ingin dimuat kembali ke keranjang kasir.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-2 py-2">
            {heldOrders.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">Tidak ada pesanan yang ditahan.</p>
            ) : (
              heldOrders.map((hold) => {
                const total = hold.cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
                return (
                  <div key={hold.holdId} className="flex items-center justify-between p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="font-bold text-sm">{hold.customerName}</div>
                      <div className="text-xs text-slate-400">{hold.holdId} • {hold.timestamp} • {hold.cart.length} items</div>
                      <div className="text-xs font-semibold text-sky-600 mt-1">{formatPrice(total)}</div>
                    </div>
                    <Button size="sm" onClick={() => handleRecallOrder(hold)} className="bg-sky-600 hover:bg-sky-700 text-white text-xs cursor-pointer">
                      Muat Order
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIRECT THERMAL RECEIPT PRINTING MODAL (58mm / 80mm)                        */}
      {/* ========================================================================= */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="sm:max-w-110 dark:bg-slate-900 p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500 h-5 w-5" /> Struk Transaksi POS
              </span>
              {/* Paper Format Selector */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setReceiptPaperWidth("80mm")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    receiptPaperWidth === "80mm" ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white" : "text-slate-500"
                  }`}
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptPaperWidth("58mm")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    receiptPaperWidth === "58mm" ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white" : "text-slate-500"
                  }`}
                >
                  58mm
                </button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {completedReceipt && (
            <div className="space-y-4 pt-2">
              {/* Printable Thermal Receipt Container */}
              <div
                id="thermal-receipt-printable"
                className={`mx-auto bg-white text-slate-900 p-4 border border-dashed border-slate-300 rounded-xl font-mono text-xs shadow-inner ${
                  receiptPaperWidth === "58mm" ? "max-w-67.5" : "max-w-85"
                }`}
              >
                {/* Header Toko */}
                <div className="text-center space-y-0.5 pb-2.5 border-b border-dashed border-slate-400">
                  <h3 className="font-black text-sm uppercase tracking-wider">FLOWERP STORE</h3>
                  <p className="text-[10px] text-slate-600">Enterprise Smart Retail & POS</p>
                  <p className="text-[10px] text-slate-500">Telp: 0812-3456-7890</p>
                </div>

                {/* Metadata Transaksi */}
                <div className="py-2 space-y-0.5 text-[11px] border-b border-dashed border-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">No Order:</span>
                    <span className="font-bold">{completedReceipt.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waktu:</span>
                    <span>{completedReceipt.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kasir:</span>
                    <span>{activeShift?.kasir || "Kasir Utama"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pelanggan:</span>
                    <span className="font-semibold">{completedReceipt.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pembayaran:</span>
                    <span className="font-semibold">{completedReceipt.paymentMethod}</span>
                  </div>
                </div>

                {/* Line Items */}
                <div className="py-2.5 space-y-1 border-b border-dashed border-slate-300">
                  {completedReceipt.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold text-slate-900 truncate">
                        {item.product}
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>{item.quantity} × {formatPrice(item.unitPrice)}</span>
                        <span className="font-bold">{formatPrice(item.unitPrice * item.quantity)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals & Loyalty Points Info */}
                <div className="py-2 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{formatPrice(completedReceipt.subtotal)}</span>
                  </div>

                  {completedReceipt.loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-indigo-700 font-bold">
                      <span>Diskon Poin ({completedReceipt.pointsRedeemed} Pts):</span>
                      <span>-{formatPrice(completedReceipt.loyaltyDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Pajak (PPN 11%):</span>
                    <span>{formatPrice(completedReceipt.tax)}</span>
                  </div>

                  <div className="flex justify-between text-xs font-black text-slate-900 pt-1 border-t border-slate-300">
                    <span>TOTAL:</span>
                    <span className="text-sm">{formatPrice(completedReceipt.total)}</span>
                  </div>

                  {completedReceipt.paymentMethod === "Cash" && (
                    <>
                      <div className="flex justify-between text-slate-600 pt-0.5">
                        <span>Tunai:</span>
                        <span>{formatPrice(completedReceipt.cashTendered)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-700">
                        <span>Kembalian:</span>
                        <span>{formatPrice(completedReceipt.changeAmount)}</span>
                      </div>
                    </>
                  )}

                  {/* Loyalty Points Earned Notification */}
                  {completedReceipt.pointsEarned > 0 && (
                    <div className="mt-1 pt-1 border-t border-dashed border-slate-200 text-center text-[10px] text-indigo-700 font-bold">
                      ⭐ Anda Mendapatkan +{completedReceipt.pointsEarned} Loyalty Points!
                    </div>
                  )}
                </div>

                {/* Footer Struk */}
                <div className="text-center pt-2.5 border-t border-dashed border-slate-400 text-[10px] text-slate-500 space-y-0.5">
                  <p className="font-bold text-slate-700">Terima Kasih Atas Kunjungan Anda!</p>
                  <p>Barang yang sudah dibeli tidak dapat ditukar.</p>
                  <div className="font-mono text-[9px] text-slate-400 pt-1">
                    * * * {completedReceipt.orderNumber} * * *
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handlePrintThermal}
                  className="flex-1 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Printer className="h-4 w-4" /> Cetak Struk Thermal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="flex-1 rounded-xl cursor-pointer"
                >
                  Transaksi Baru
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
