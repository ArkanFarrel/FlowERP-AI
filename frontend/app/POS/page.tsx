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
  WifiOff
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { getInventory } from "@/app/actions/inventory";
import { createPOSCheckoutOrder } from "@/app/actions/sales";
import { formatPrice, syncLiveExchangeRates } from "@/lib/currency";
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

interface CompletedReceipt {
  orderNumber: string;
  date: string;
  customerName: string;
  paymentMethod: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  cashTendered: number;
  changeAmount: number;
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
  cart: CartItem[];
  discountPercent: number;
  timestamp: string;
}

export default function POSTerminalPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Feature C: Offline-First PWA
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // Feature A: Shift Management
  const [activeShift, setActiveShift] = useState<ShiftData | null>(null);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  
  const [shiftKasir, setShiftKasir] = useState("");
  const [shiftModal, setShiftModal] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");

  // Feature B: Held Orders
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState(false);

  // Products & Inventory Data
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Cart & Transaction State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "QRIS" | "Card" | "Transfer">("Cash");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxEnabled, setTaxEnabled] = useState<boolean>(true);
  const [cashTenderedInput, setCashTenderedInput] = useState<string>("");

  // Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<CompletedReceipt | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

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
        if (toast) toast.success(`Synced ${processed} offline orders!`);
      } else {
        const remaining = q.slice(processed);
        localStorage.setItem('flowerp_offline_queue', JSON.stringify(remaining));
        setOfflineQueueCount(remaining.length);
        if (toast) toast.info(`Synced ${processed} orders, ${remaining.length} remaining.`);
      }
    } catch (err) {
      console.error("Error processing offline queue", err);
    }
  };

  useEffect(() => {
    // Offline status detection
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

    // Initial data load
    syncLiveExchangeRates();
    fetchProducts();
    
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
      } catch(e) {}
    }
    
    return () => { 
      window.removeEventListener('online', goOnline); 
      window.removeEventListener('offline', goOffline); 
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const { getProducts } = await import("@/app/actions/products");
      const res = await getProducts();
      let mapped: ProductItem[] = [];
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        mapped = res.data.map((p: Record<string, unknown>, idx: number) => ({
          id: String(p.id || idx),
          dbId: String(p.id || ''),
          product: String(p.name || ''),
          sku: String(p.sku || ''),
          category: String(p.category || 'General'),
          warehouse: String(p.warehouse || 'Central Store'),
          stock: Number(p.stock || 0),
          unitPrice: Number(p.sellingPrice) || 0,
          status: Number(p.stock || 0) === 0 ? "Out of Stock" : Number(p.stock || 0) <= 15 ? "Low Stock" : "In Stock",
        }));
      } else {
        // Fallback getInventory
        const invRes = await getInventory();
        const rows = invRes?.data || [];
        if (rows && rows.length > 0) {
          mapped = rows.map((r: Record<string, unknown>, idx: number) => {
            const rawPrice =
              typeof r.price === "string"
                ? parseFloat(r.price.replace(/[^0-9.]/g, "")) || 0
                : Number(r.price) || 0;
            return {
              id: String(r.id || idx),
              dbId: String(r.id || ''),
              product: String(r.product || ''),
              sku: String(r.sku || ''),
              category: String(r.category || "General"),
              warehouse: String(r.warehouse || "Main Store"),
              stock: Number(r.stock) || 0,
              unitPrice: rawPrice,
              status: String(r.status || "In Stock"),
            };
          });
        }
      }
      setProducts(mapped);
      localStorage.setItem('flowerp_products_cache', JSON.stringify(mapped));
    } catch (err) {
      console.error("Failed to load products for POS:", err);
      // Attempt load from cache
      const cached = localStorage.getItem('flowerp_products_cache');
      if (cached) {
        try {
          setProducts(JSON.parse(cached));
        } catch(e) {}
      }
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleOpenShift = () => {
    if (!shiftKasir || !shiftModal) return;
    const newShift: ShiftData = {
      kasir: shiftKasir,
      modalAwal: Number(shiftModal),
      notes: shiftNotes,
      startTime: new Date().toLocaleString("id-ID"),
      transactions: []
    };
    setActiveShift(newShift);
    localStorage.setItem('flowerp_active_shift', JSON.stringify(newShift));
    setIsOpenShiftModalOpen(false);
    if (toast) toast.success("Shift berhasil dibuka!");
  };

  const handleCloseShift = () => {
    setActiveShift(null);
    localStorage.removeItem('flowerp_active_shift');
    setIsZReportOpen(false);
    setShiftKasir("");
    setShiftModal("");
    setShiftNotes("");
    setIsOpenShiftModalOpen(true);
    if (toast) toast.success("Shift berhasil ditutup.");
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    if (heldOrders.length >= 5) {
      // Custom internal message per spec
      return;
    }
    const newHold: HeldOrder = {
      holdId: `HOLD-${Date.now()}`,
      customerName: customerName.trim() || "Walk-in Customer",
      cart: [...cart],
      discountPercent,
      timestamp: new Date().toLocaleString("id-ID")
    };
    const updated = [...heldOrders, newHold];
    setHeldOrders(updated);
    localStorage.setItem('flowerp_held_orders', JSON.stringify(updated));
    handleClearCart();
    if (toast) toast.success("Order ditahan.");
  };

  const handleResumeHold = (holdId: string) => {
    const hold = heldOrders.find(h => h.holdId === holdId);
    if (!hold) return;
    setCart(hold.cart);
    setCustomerName(hold.customerName);
    setDiscountPercent(hold.discountPercent);
    handleDeleteHold(holdId);
    setIsHeldOrdersOpen(false);
  };

  const handleDeleteHold = (holdId: string) => {
    const updated = heldOrders.filter(h => h.holdId !== holdId);
    setHeldOrders(updated);
    localStorage.setItem('flowerp_held_orders', JSON.stringify(updated));
  };

  const categories = useMemo(() => {
    const setCat = new Set<string>();
    setCat.add("All");
    products.forEach((p) => {
      if (p.category) setCat.add(p.category);
    });
    return Array.from(setCat);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat =
        selectedCategory === "All" || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleAddToCart = (product: ProductItem) => {
    if (product.stock <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prevCart;
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
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
      }
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty > item.stockAvailable) return item;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCart([]);
    setCashTenderedInput("");
    setDiscountPercent(0);
    setCustomerName("Walk-in Customer");
  };

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent]);

  const taxAmount = useMemo(() => {
    if (!taxEnabled) return 0;
    return (subtotal - discountAmount) * 0.11; // PPN 11%
  }, [subtotal, discountAmount, taxEnabled]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + taxAmount);
  }, [subtotal, discountAmount, taxAmount]);

  const cashTenderedVal = useMemo(() => {
    return Number(cashTenderedInput) || 0;
  }, [cashTenderedInput]);

  const changeAmount = useMemo(() => {
    if (paymentMethod !== "Cash") return 0;
    return Math.max(0, cashTenderedVal - grandTotal);
  }, [paymentMethod, cashTenderedVal, grandTotal]);

  const canCheckout = useMemo(() => {
    if (cart.length === 0) return false;
    if (paymentMethod === "Cash" && cashTenderedVal < grandTotal) return false;
    return true;
  }, [cart, paymentMethod, cashTenderedVal, grandTotal]);

  const handleProcessCheckout = async () => {
    if (!activeShift) {
      toast.info("Silakan buka shift kasir terlebih dahulu untuk memproses transaksi.");
      setIsOpenShiftModalOpen(true);
      return;
    }
    if (!canCheckout) return;
    setIsProcessingCheckout(true);

    const generatedOrderNo = `POS-${Math.floor(10000 + Math.random() * 90000)}`;
    const payload = {
      orderNumber: generatedOrderNo,
      customerName: customerName.trim() || "Walk-in Customer",
      paymentMethod,
      subtotal,
      tax: taxAmount,
      discount: discountAmount,
      totalAmount: grandTotal,
      cashTendered: paymentMethod === "Cash" ? cashTenderedVal : grandTotal,
      changeAmount,
      items: cart.map((c) => ({
        productId: c.id,
        productName: c.product,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        subtotal: c.unitPrice * c.quantity,
      })),
    };

    const receipt: CompletedReceipt = {
      orderNumber: generatedOrderNo,
      date: new Date().toLocaleString("id-ID"),
      customerName: customerName.trim() || "Walk-in Customer",
      paymentMethod,
      items: [...cart],
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total: grandTotal,
      cashTendered: paymentMethod === "Cash" ? cashTenderedVal : grandTotal,
      changeAmount,
      isOffline: !isOnline
    };

    try {
      if (!isOnline) {
        // Queue for offline processing
        const q = JSON.parse(localStorage.getItem('flowerp_offline_queue') || '[]');
        q.push(payload);
        localStorage.setItem('flowerp_offline_queue', JSON.stringify(q));
        setOfflineQueueCount(q.length);
        
        // Process UI success locally
        updateShiftAfterTransaction(generatedOrderNo, grandTotal, paymentMethod);
        setCompletedReceipt(receipt);
        setIsReceiptModalOpen(true);
        handleClearCart();
      } else {
        const res = await createPOSCheckoutOrder(payload);
        if (res && res.success) {
          updateShiftAfterTransaction(generatedOrderNo, grandTotal, paymentMethod);
          setCompletedReceipt(receipt);
          setIsReceiptModalOpen(true);
          handleClearCart();
          fetchProducts();
        } else {
          // If network failed here despite being "online"
          throw new Error("API failed");
        }
      }
    } catch (err) {
      console.error("POS Checkout failed:", err);
      // Fallback to queue if unexpected network error
      const q = JSON.parse(localStorage.getItem('flowerp_offline_queue') || '[]');
      q.push(payload);
      localStorage.setItem('flowerp_offline_queue', JSON.stringify(q));
      setOfflineQueueCount(q.length);
      receipt.isOffline = true;
      updateShiftAfterTransaction(generatedOrderNo, grandTotal, paymentMethod);
      setCompletedReceipt(receipt);
      setIsReceiptModalOpen(true);
      handleClearCart();
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const updateShiftAfterTransaction = (orderNo: string, total: number, paymentMethod: string) => {
    setActiveShift(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        transactions: [
          ...prev.transactions,
          {
            orderNumber: orderNo,
            total,
            paymentMethod,
            time: new Date().toLocaleString("id-ID")
          }
        ]
      };
      localStorage.setItem('flowerp_active_shift', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/Login");
  };

  const totalShiftSales = useMemo(() => {
    return activeShift?.transactions.reduce((acc, t) => acc + t.total, 0) || 0;
  }, [activeShift]);

  return (
    <div
      className={`flex h-screen overflow-hidden ${
        isDark ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      <Sidebar sidebarOpen={sidebarOpen} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDark={isDark}
          setIsDark={setIsDark}
        />

        {/* Feature A: Active Shift Bar / Notice */}
        {activeShift ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 px-6 py-2 flex items-center justify-between">
            <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Shift Aktif • <span className="font-bold">{activeShift.kasir}</span> • Mulai: {activeShift.startTime} • Modal: {formatPrice(activeShift.modalAwal)}
            </div>
            <Button onClick={() => setIsZReportOpen(true)} variant="outline" size="sm" className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 cursor-pointer">
              Tutup Shift
            </Button>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Shift belum dibuka — Anda dalam mode peninjauan katalog. Buka shift untuk memproses transaksi kasir.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push('/Dashboard')}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-amber-100/70 dark:hover:bg-amber-900/40 h-8 text-xs cursor-pointer"
              >
                ← Kembali ke Dashboard
              </Button>
              <Button
                onClick={() => setIsOpenShiftModalOpen(true)}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 cursor-pointer shadow-xs"
              >
                Buka Shift Kasir
              </Button>
            </div>
          </div>
        )}

        {/* POS Body Container */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden bg-slate-100/60 dark:bg-slate-950">
          {/* LEFT PANEL */}
          <div className="lg:col-span-7 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden min-h-125">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                      POS Cashier Terminal
                    </h1>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Fast multi-item checkout</span>
                      {/* Feature C: Offline Status */}
                      <span className="flex items-center gap-1">
                        {isOnline ? (
                          <><div className="h-2 w-2 rounded-full bg-emerald-500"></div> Online</>
                        ) : (
                          <><div className="h-2 w-2 rounded-full bg-rose-500"></div> Offline</>
                        )}
                        {offlineQueueCount > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 font-semibold text-[10px]">
                            {offlineQueueCount} Pending
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Feature B: Hold Orders Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsHeldOrdersOpen(true)}
                    className="rounded-xl text-xs flex items-center gap-1.5 relative border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40 cursor-pointer"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Pesanan Ditahan
                    {heldOrders.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                        {heldOrders.length}
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchProducts}
                    className="rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingProducts ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search product name or SKU / Barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
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

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingProducts ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <RefreshCw className="h-8 w-8 animate-spin mb-2 text-sky-600" />
                  <p className="text-xs font-semibold">Loading Catalog Products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center">
                  <Package className="h-10 w-10 mb-2 opacity-50 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No products found
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try clearing search or adding products in Product Catalog
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredProducts.map((p) => {
                    const cartEntry = cart.find((item) => item.id === p.id);
                    const isOutOfStock = p.stock <= 0;

                    return (
                      <div
                        key={p.id}
                        onClick={() => !isOutOfStock && handleAddToCart(p)}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 transition duration-200 text-left ${
                          isOutOfStock
                            ? "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900 cursor-not-allowed"
                            : "border-slate-200/80 bg-white hover:border-sky-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500 cursor-pointer"
                        }`}
                      >
                        {cartEntry && (
                          <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-xs font-black text-white shadow-md">
                            {cartEntry.quantity}
                          </span>
                        )}

                        <div>
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 truncate">
                              {p.category}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isOutOfStock
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  : p.stock <= 5
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}
                            >
                              Stok: {p.stock}
                            </span>
                          </div>

                          <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                            {p.product}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            SKU: {p.sku}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-sm font-black text-sky-600 dark:text-sky-400">
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

          {/* RIGHT PANEL */}
          <div className="lg:col-span-5 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Customer Name
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="h-8 text-xs mt-0.5 rounded-lg border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="flex flex-col items-end gap-1 mt-4">
                <div className="flex gap-1">
                  {/* Feature B: Hold Order button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleHoldOrder}
                    disabled={cart.length === 0}
                    className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                    title="Hold Order"
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
                    Clear Cart
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                  <ShoppingCart className="h-12 w-12 mb-3 opacity-30 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Cart is Empty
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Click products on the left catalog grid to add items to order cart.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex-1 min-w-0 pr-3">
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

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      <span className="w-6 text-center text-xs font-bold text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        disabled={item.quantity >= item.stockAvailable}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-400 ml-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3">
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

              {paymentMethod === "Cash" && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Uang Tunai (Cash Received):
                    </span>
                    {cashTenderedVal > 0 && cashTenderedVal < grandTotal && (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Less than total
                      </span>
                    )}
                  </div>
                  <Input
                    type="number"
                    placeholder="Enter cash amount (e.g. 100000)"
                    value={cashTenderedInput}
                    onChange={(e) => setCashTenderedInput(e.target.value)}
                    className="h-10 text-sm font-bold text-sky-600 rounded-xl"
                  />
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setCashTenderedInput(String(grandTotal))}
                      className="px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-semibold hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300 whitespace-nowrap cursor-pointer"
                    >
                      Pas (Exact)
                    </button>
                    {[50000, 100000, 200000, 500000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCashTenderedInput(String(preset))}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap cursor-pointer"
                      >
                        {formatPrice(preset)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 text-xs border-t border-slate-100 dark:border-slate-800 pt-2">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} items)</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Tax (PPN 11%)</span>
                  <span>{formatPrice(taxAmount)}</span>
                </div>

                {paymentMethod === "Cash" && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Kembalian (Change)</span>
                    <span>{formatPrice(changeAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Amount</span>
                  <span className="text-sky-600 dark:text-sky-400">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleProcessCheckout}
                disabled={!canCheckout || isProcessingCheckout}
                className={`w-full h-12 rounded-2xl font-bold text-sm transition cursor-pointer shadow-md disabled:opacity-50 ${
                  !activeShift ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-sky-600 hover:bg-sky-700 text-white"
                }`}
              >
                {isProcessingCheckout ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Processing...
                  </div>
                ) : !activeShift ? (
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-5 w-5" /> Buka Shift untuk Selesaikan Transaksi
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> {isOnline ? "Complete POS Transaction" : "Complete Offline Order"}
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature A: Buka Shift Modal */}
      <Dialog open={isOpenShiftModalOpen} onOpenChange={setIsOpenShiftModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Buka Shift Kasir</DialogTitle>
            <DialogDescription>
              Silakan isi data kasir dan modal awal untuk memulai transaksi kasir, atau tutup untuk mode peninjauan katalog.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nama Kasir <span className="text-rose-500">*</span></label>
              <Input value={shiftKasir} onChange={e => setShiftKasir(e.target.value)} placeholder="Misal: Budi" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Modal Awal <span className="text-rose-500">*</span></label>
              <Input type="number" value={shiftModal} onChange={e => setShiftModal(e.target.value)} placeholder="Misal: 500000" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Catatan (Opsional)</label>
              <Input value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} placeholder="Catatan shift..." />
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
              className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer h-9 px-4"
            >
              Buka Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature A: Z-Report (Tutup Shift) Modal */}
      <Dialog open={isZReportOpen} onOpenChange={setIsZReportOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Z-Report (Tutup Shift)</DialogTitle>
            <DialogDescription>
              Ringkasan transaksi selama shift.
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
                <span className="text-slate-500">Total Penerimaan (Sales):</span>
                <span className="font-semibold text-emerald-600">{formatPrice(totalShiftSales)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2">
                <span>Estimasi Kas Laci:</span>
                <span className="text-sky-600">{formatPrice(activeShift.modalAwal + totalShiftSales)}</span>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsZReportOpen(false)} className="cursor-pointer">Batal</Button>
            <Button onClick={handleCloseShift} className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer">Konfirmasi Tutup Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature B: Held Orders Modal */}
      <Dialog open={isHeldOrdersOpen} onOpenChange={setIsHeldOrdersOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Pesanan Ditahan</DialogTitle>
            <DialogDescription>
              Daftar pesanan yang sedang di-hold (maksimal 5).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto">
            {heldOrders.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-4">Tidak ada pesanan yang ditahan.</p>
            ) : (
              heldOrders.map(hold => {
                const total = hold.cart.reduce((a, b) => a + b.unitPrice * b.quantity, 0);
                const itemsCount = hold.cart.reduce((a, b) => a + b.quantity, 0);
                return (
                  <div key={hold.holdId} className="flex flex-col gap-2 p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm">{hold.customerName}</p>
                        <p className="text-xs text-slate-500">{hold.timestamp} • {itemsCount} items</p>
                      </div>
                      <span className="font-bold text-sky-600">{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={() => handleDeleteHold(hold.holdId)} className="text-rose-600 border-rose-200 hover:bg-rose-50 h-8 cursor-pointer">
                        Hapus
                      </Button>
                      <Button size="sm" onClick={() => handleResumeHold(hold.holdId)} className="bg-sky-600 hover:bg-sky-700 text-white h-8 cursor-pointer">
                        Ambil
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setIsHeldOrdersOpen(false)} className="cursor-pointer">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RECEIPT MODAL */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className={`p-5 text-white flex items-center justify-between ${completedReceipt?.isOffline ? "bg-amber-600 dark:bg-amber-900" : "bg-sky-600 dark:bg-sky-950"}`}>
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-white" />
              <h3 className="text-base font-bold text-white">Cashier Thermal Receipt</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(false)}
              className="rounded-xl bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
            >
              Close
            </button>
          </div>

          {completedReceipt && (
            <div className="p-6 space-y-4">
              {completedReceipt.isOffline && (
                <div className="bg-amber-50 text-amber-800 p-2 text-xs text-center rounded-lg border border-amber-200 flex items-center justify-center gap-1">
                  <WifiOff className="h-3 w-3" /> Transaksi Offline (Tersimpan Lokal)
                </div>
              )}
              <div
                id="receipt-print-area"
                className="bg-white p-5 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 space-y-3 shadow-inner"
              >
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    FLOWERP STORE
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Enterprise Intelligence Retail Suite
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    No: #{completedReceipt.orderNumber}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {completedReceipt.date}
                  </p>
                </div>

                <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-semibold">{completedReceipt.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment:</span>
                    <span className="font-semibold">{completedReceipt.paymentMethod}</span>
                  </div>
                </div>

                <div className="space-y-2 pb-3 border-b border-dashed border-slate-300">
                  {completedReceipt.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-semibold text-slate-900 truncate">
                        {item.product}
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>
                          {item.quantity} × {formatPrice(item.unitPrice)}
                        </span>
                        <span className="font-bold">
                          {formatPrice(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{formatPrice(completedReceipt.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (11%):</span>
                    <span>{formatPrice(completedReceipt.tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                    <span>TOTAL:</span>
                    <span>{formatPrice(completedReceipt.total)}</span>
                  </div>
                  {completedReceipt.paymentMethod === "Cash" && (
                    <>
                      <div className="flex justify-between text-slate-600 pt-1">
                        <span>Cash Paid:</span>
                        <span>{formatPrice(completedReceipt.cashTendered)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-700">
                        <span>Change:</span>
                        <span>{formatPrice(completedReceipt.changeAmount)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
                  <p className="font-semibold text-slate-700">Terima Kasih Atas Kunjungan Anda!</p>
                  <p>Barang yang sudah dibeli tidak dapat ditukar.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    document.body.classList.add("printing-receipt");
                    window.print();
                    setTimeout(() => {
                      document.body.classList.remove("printing-receipt");
                    }, 500);
                  }}
                  className="flex-1 bg-sky-600 text-white font-semibold rounded-2xl hover:bg-sky-700 transition cursor-pointer"
                >
                  <Printer className="h-4 w-4 mr-2" /> Print Struk
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="flex-1 rounded-2xl border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  New Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
