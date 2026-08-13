"use client";
import Sidebar from "@/components/ui/layout/sidebar";
import Topbar from "@/components/ui/layout/topbar";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProducts, createProduct } from "@/app/actions/products";
import { apiFetch } from "@/lib/api";
import { exportToCSV } from "@/lib/export";
import { formatPrice } from "@/lib/currency";
import {
  AlertTriangle,
  ArrowRightCircle,
  ArrowUp,
  ArrowUpRight,
  Box,
  CalendarDays,
  ClipboardList,
  Download,
  Filter,
  Layers,
  Package,
  PlusCircle,
  RefreshCcw,
  ShieldCheck,
  Truck,
  Upload,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStockMovements, createStockAdjustment } from "@/app/actions/inventory";

type InventoryItem = {
  id: string;
  product: string;
  sku: string;
  category: string;
  warehouse: string;
  stock: number;
  reserved: number;
  available: number;
  cost: string;
  price: string;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  updated: string;
};

interface InventoryFormData {
  product: string;
  sku: string;
  category: string;
  warehouse: string;
  stock: number;
  reserved: number;
  cost: number;
  price: number;
}

const initialInventoryRows: InventoryItem[] = [];


const quickActions = [
  {
    title: "Add Product",
    description: "Start a new inventory item.",
    icon: PlusCircle,
  },
  {
    title: "Stock Adjustment",
    description: "Update quantities with ease.",
    icon: RefreshCcw,
  },
  {
    title: "Transfer Stock",
    description: "Move inventory between warehouses.",
    icon: Truck,
  },
  {
    title: "Create Purchase Order",
    description: "Replenish inventory proactively.",
    icon: ClipboardList,
  },
  {
    title: "Receive Goods",
    description: "Confirm inbound shipments.",
    icon: Download,
  },
  {
    title: "Export Inventory",
    description: "Download product data quickly.",
    icon: Upload,
  },
];

const statusBadge = (status: string) => {
  if (status === "In Stock")
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (status === "Low Stock")
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200";
  return "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200";
};

/**
 * Helper function untuk menentukan status berdasarkan stock
 */
function determineInventoryStatus(stock: number, minStock: number = 10): InventoryItem["status"] {
  if (stock <= 0) {
    return "Out of Stock";
  } else if (stock <= minStock) {
    return "Low Stock";
  }
  return "In Stock";
}

/**
 * Helper function untuk generate inventory ID
 */
// function generateInventoryId(): string {
//   return `inv-${Date.now()}`;
// }

export default function InventoryPage() {
  const [inventoryRows, setInventoryRows] =
    useState<InventoryItem[]>(initialInventoryRows);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Popup 1: Add Inventory Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<
    "basic" | "stock" | "pricing"
  >("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<InventoryFormData>({
    product: "",
    sku: "",
    category: "",
    warehouse: "",
    stock: 0,
    reserved: 0,
    cost: 0,
    price: 0,
  });

  // Popup 2: Stock Adjustment Modal State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"IN" | "OUT" | "ADJUST">(
    "IN",
  );
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState<number>(10);
  const [adjustmentReason, setAdjustmentReason] =
    useState<string>("Stock Audit");
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>("");

  // Popup 3: Movement History Log Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [movementLogs, setMovementLogs] = useState<
    Array<{
      id: string;
      item: string;
      type: "IN" | "OUT" | "ADJUST";
      qty: number;
      reason: string;
      date: string;
      user: string;
    }>
  >([]);
  // Import CSV Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Multi-Warehouse Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferProductId, setTransferProductId] = useState("");
  const [transferSourceWarehouse, setTransferSourceWarehouse] = useState("Gudang Utama");
  const [transferTargetWarehouse, setTransferTargetWarehouse] = useState("Gudang Jakarta");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [waybillDetails, setWaybillDetails] = useState<{
    waybillNumber: string;
    productName: string;
    sku: string;
    quantity: number;
    sourceWarehouse: string;
    targetWarehouse: string;
    date: string;
  } | null>(null);

  // Filter Panel State
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [warehouseFilter, setWarehouseFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredInventory = useMemo(() => {
    return inventoryRows.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory =
        categoryFilter === "All" || item.category === categoryFilter;

      const matchWarehouse =
        warehouseFilter === "All" || item.warehouse === warehouseFilter;

      const matchStatus =
        statusFilter === "All" || item.status === statusFilter;

      return matchSearch && matchCategory && matchWarehouse && matchStatus;
    });
  }, [inventoryRows, searchQuery, categoryFilter, warehouseFilter, statusFilter]);

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    inventoryRows.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [inventoryRows]);

  const warehousesList = useMemo(() => {
    const set = new Set<string>();
    inventoryRows.forEach((i) => {
      if (i.warehouse) set.add(i.warehouse);
    });
    return Array.from(set);
  }, [inventoryRows]);

  const handleExportInventory = () => {
    if (filteredInventory.length === 0) {
      alert("Tidak ada data inventaris untuk diekspor.");
      return;
    }
    const exportData = filteredInventory.map((item) => ({
      ID: item.id,
      Product_Name: item.product,
      SKU: item.sku,
      Category: item.category,
      Warehouse: item.warehouse,
      Stock: item.stock,
      Cost_Price: item.cost,
      Selling_Price: item.price,
      Status: item.status,
      Last_Updated: item.updated,
    }));
    exportToCSV("inventory_products_report", exportData);
  };

  const handleDownloadSampleCSV = () => {
    const sample = [
      {
        Name: "Sample Product A",
        SKU: "SMP-001",
        Category: "Electronics",
        Warehouse: "Central Store",
        Stock: 50,
        CostPrice: 15,
        SellingPrice: 25,
      },
      {
        Name: "Sample Product B",
        SKU: "SMP-002",
        Category: "Apparel",
        Warehouse: "Jakarta Branch",
        Stock: 100,
        CostPrice: 8,
        SellingPrice: 15,
      },
    ];
    exportToCSV("sample_import_products_template", sample);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setImportCsvText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleProcessImportCSV = async () => {
    if (!importCsvText.trim()) {
      alert("Silakan upload file CSV atau masukkan teks CSV terlebih dahulu.");
      return;
    }
    setIsImporting(true);
    try {
      const lines = importCsvText.trim().split("\n");
      if (lines.length < 2) {
        alert("Format CSV tidak valid. Harus ada baris header dan minimal 1 baris data.");
        setIsImporting(false);
        return;
      }

      let successCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (row.length < 2 || !row[0]) continue;

        const name = row[0] || "Imported Product";
        // eslint-disable-next-line react-hooks/purity
        const sku = row[1] || `IMP-${Date.now()}-${i}`;
        const category = row[2] || "General";
        const warehouse = row[3] || "Central Store";
        const stock = Number(row[4]) || 10;
        const costPrice = Number(row[5]) || 0;
        const sellingPrice = Number(row[6]) || 0;

        try {
          await createProduct({
            name,
            sku,
            category,
            warehouse,
            stock,
            costPrice,
            sellingPrice,
            description: "Imported via CSV",
          });
          successCount++;
        } catch {
          // ignore individual row error
        }
      }

      alert(`Berhasil mengimpor ${successCount} produk baru ke dalam database inventaris!`);
      setIsImportModalOpen(false);
      setImportCsvText("");
      fetchInventoryData();
    } catch {
      alert("Terjadi kesalahan saat memproses CSV.");
    } finally {
      setIsImporting(false);
    }
  };

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [dbMovements, setDbMovements] = useState<Array<{
    id: string;
    type: string;
    rawType: string;
    product: string;
    quantity: string;
    warehouse: string;
    time: string;
    user: string;
  }>>([]);

  const fetchInventoryData = async () => {
    setIsLoading(true);
    try {
      const movRes = await getStockMovements();
      if (movRes && movRes.success && Array.isArray(movRes.data)) {
        setDbMovements(movRes.data);
      }

      const serverRes = await getProducts();
      if (serverRes && serverRes.success && Array.isArray(serverRes.data) && serverRes.data.length > 0) {
        const mappedItems: InventoryItem[] = serverRes.data.map((p) => ({
          id: String(p.id || ''),
          product: String(p.name || ''),
          sku: String(p.sku || ''),
          category: String(p.category || 'Uncategorized'),
          warehouse: String(p.warehouse || 'Central Store'),
          stock: Number(p.stock || 0),
          reserved: 0,
          available: Number(p.stock || 0),
          cost: typeof p.costPrice === 'number' ? `$${p.costPrice.toFixed(2)}` : String(p.costPrice || '$0.00'),
          price: typeof p.sellingPrice === 'number' ? `$${p.sellingPrice.toFixed(2)}` : String(p.sellingPrice || '$0.00'),
          status: determineInventoryStatus(Number(p.stock || 0), Number(p.minStock || 10)),
          updated: 'Just now',
        }));
        setInventoryRows(mappedItems);
        return;
      }

      const res = await apiFetch('/products');
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedItems: InventoryItem[] = (res.data as any[]).map((p) => ({
          id: String(p.id || ''),
          product: String(p.name || ''),
          sku: String(p.sku || ''),
          category: p.category?.name || 'Uncategorized',
          warehouse: String(p.warehouse || 'Central Store'),
          stock: Number(p.stock || 0),
          reserved: 0,
          available: Number(p.stock || 0),
          cost: `$${Number(p.costPrice || 0).toFixed(2)}`,
          price: `$${Number(p.sellingPrice || 0).toFixed(2)}`,
          status: determineInventoryStatus(Number(p.stock || 0), Number(p.minStock || 10)),
          updated: 'Just now',
        }));
        setInventoryRows(mappedItems);
      } else if (serverRes && Array.isArray(serverRes.data)) {
        const mappedItems: InventoryItem[] = serverRes.data.map((p) => ({
          id: String(p.id || ''),
          product: String(p.name || ''),
          sku: String(p.sku || ''),
          category: String(p.category || 'Uncategorized'),
          warehouse: String(p.warehouse || 'Central Store'),
          stock: Number(p.stock || 0),
          reserved: 0,
          available: Number(p.stock || 0),
          cost: typeof p.costPrice === 'number' ? `$${p.costPrice.toFixed(2)}` : String(p.costPrice || '$0.00'),
          price: typeof p.sellingPrice === 'number' ? `$${p.sellingPrice.toFixed(2)}` : String(p.sellingPrice || '$0.00'),
          status: determineInventoryStatus(Number(p.stock || 0), Number(p.minStock || 10)),
          updated: 'Just now',
        }));
        setInventoryRows(mappedItems);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Error fetching inventory data:", msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);


  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/Login");
  };

  const handleInputChange = (
    field: keyof InventoryFormData,
    value: unknown,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAutoGenerateSku = () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const categoryPrefix = (formData.category || "INV")
      .slice(0, 3)
      .toUpperCase();
    const newSku = `${categoryPrefix}-${new Date().getFullYear()}-${randomCode}`;
    setFormData((prev) => ({ ...prev, sku: newSku }));
  };

  const handleResetForm = () => {
    setFormData({
      product: "",
      sku: "",
      category: "",
      warehouse: "",
      stock: 0,
      reserved: 0,
      cost: 0,
      price: 0,
    });
    setActiveModalTab("basic");
  };

  const handleSaveInventory = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.product || !formData.sku || !formData.warehouse) {
        alert(
          "Please fill in all required fields (Product Name, SKU, Warehouse)",
        );
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = {
          name: formData.product,
          sku: formData.sku,
          categoryName: formData.category || "General Supplies",
          warehouse: formData.warehouse,
          stock: Number(formData.stock) || 0,
          costPrice: Number(formData.cost) || 0,
          sellingPrice: Number(formData.price) || 0,
        };

        // 1. Try Prisma Server Action first
        let res;
        try {
          res = await createProduct(payload);
        } catch {
          // ignore
        }

        // 2. Fallback to apiFetch if server action returns !res.success
        if (!res || !res.success) {
          try {
            res = await apiFetch("/products", {
              method: "POST",
              body: JSON.stringify(payload),
            });
          } catch {
            // ignore
          }
        }

        if (res && res.success) {
          fetchInventoryData();
          handleResetForm();
          setIsAddModalOpen(false);
        } else {
          // Local optimistic state fallback
          fetchInventoryData();
          handleResetForm();
          setIsAddModalOpen(false);
        }
      } catch (error) {
        console.error("Error saving inventory:", error);
        alert("Failed to save inventory item");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData],
  );

  const handleOpenAdjustmentModal = (item?: InventoryItem) => {
    const targetItem = item || inventoryRows[0] || initialInventoryRows[0];
    setSelectedItem(targetItem);
    setAdjustmentQty(10);
    setAdjustmentReason("Stock Audit");
    setAdjustmentNotes("");
    setIsAdjustmentModalOpen(true);
  };

  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || adjustmentQty <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      const typeMapping: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" =
        adjustmentType === "IN"
          ? "STOCK_IN"
          : adjustmentType === "OUT"
            ? "STOCK_OUT"
            : "ADJUSTMENT";

      // 1. Execute Prisma Server Action (Primary DB update)
      try {
        await createStockAdjustment({
          productId: selectedItem.id,
          type: typeMapping,
          quantity: Math.abs(adjustmentQty),
          notes: `${adjustmentReason} ${adjustmentNotes ? `- ${adjustmentNotes}` : ""}`,
          warehouse: selectedItem.warehouse || "Central Store",
        });
      } catch (err) {
        console.warn("Stock adjustment server action note:", err);
      }

      // Update local state smoothly
      setInventoryRows((prev) =>
        prev.map((row) => {
          if (row.id === selectedItem.id) {
            let newStock = row.stock;
            if (adjustmentType === "IN") newStock += adjustmentQty;
            else if (adjustmentType === "OUT")
              newStock = Math.max(0, newStock - adjustmentQty);
            else if (adjustmentType === "ADJUST") newStock = adjustmentQty;

            return {
              ...row,
              stock: newStock,
              available: Math.max(0, newStock - row.reserved),
              status: determineInventoryStatus(newStock),
              updated: "Just now",
            };
          }
          return row;
        }),
      );

      // Log movement transaction
      setMovementLogs((prev) => [
        {
          id: `mov-${Date.now()}`,
          item: selectedItem.product,
          type: adjustmentType,
          qty: adjustmentType === "OUT" ? -adjustmentQty : adjustmentQty,
          reason: adjustmentReason,
          date: "Just now",
          user: "Arkan (Owner)",
        },
        ...prev,
      ]);

      setIsAdjustmentModalOpen(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save stock adjustment";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };
  // Calculate stats
  const inStockCount = useMemo(
    () => inventoryRows.filter((i) => i.status === "In Stock").length,
    [inventoryRows],
  );
  const lowStockCount = useMemo(
    () => inventoryRows.filter((i) => i.status === "Low Stock").length,
    [inventoryRows],
  );
  const outOfStockCount = useMemo(
    () => inventoryRows.filter((i) => i.status === "Out of Stock").length,
    [inventoryRows],
  );

  const topSelling = useMemo(() => {
    return inventoryRows
      .slice(0, 3)
      .map((item) => ({
        name: item.product,
        units: item.stock,
        revenue: item.price,
      }));
  }, [inventoryRows]);

  const recentProducts = useMemo(() => {
    return inventoryRows
      .slice(0, 3)
      .map((item) => ({
        name: item.product,
        category: item.category,
        date: item.updated || "Recently",
      }));
  }, [inventoryRows]);

  const restocks = useMemo(() => {
    return inventoryRows
      .filter((i) => i.status === "Low Stock" || i.status === "Out of Stock")
      .slice(0, 3)
      .map((item) => ({
        name: item.product,
        arrival: "Next week",
        supplier: item.warehouse || "Central Warehouse",
      }));
  }, [inventoryRows]);

  const lowStockItems = useMemo(() => {
    return inventoryRows
      .filter((i) => i.status === "Low Stock" || i.status === "Out of Stock")
      .map((i) => ({
        name: i.product,
        stock: i.stock,
        min: 15,
        warehouse: i.warehouse,
        status: i.status === "Out of Stock" ? "Critical" : "Low Stock",
      }));
  }, [inventoryRows]);

  const warehouses = useMemo(() => {
    const map: Record<string, { name: string; count: number; val: number }> = {};
    inventoryRows.forEach((i) => {
      const wh = i.warehouse || "Central Store";
      if (!map[wh]) map[wh] = { name: wh, count: 0, val: 0 };
      map[wh].count += 1;
      const numPrice = Number(String(i.price || 0).replace(/[^0-9.-]+/g, "")) || 0;
      map[wh].val += numPrice * i.stock;
    });

    return Object.values(map).map((wh) => ({
      name: wh.name,
      products: wh.count,
      value: `$${Math.round(wh.val).toLocaleString("en-US")}`,
      usage: Math.min(90, Math.max(20, wh.count * 15)),
      status: "Active",
    }));
  }, [inventoryRows]);

  const activities = useMemo(() => {
    if (dbMovements.length > 0) {
      return dbMovements.map((mov) => ({
        id: mov.id,
        type: mov.type,
        icon: mov.rawType === "STOCK_IN" ? ArrowUp : mov.rawType === "STOCK_OUT" ? ArrowUpRight : RefreshCcw,
        product: mov.product,
        quantity: mov.quantity,
        warehouse: mov.warehouse,
        time: mov.time,
        user: mov.user,
      }));
    }

    return movementLogs.map((log) => ({
      id: log.id,
      type: log.type === "IN" ? "Stock In" : log.type === "OUT" ? "Stock Out" : "Stock Adjustment",
      icon: log.type === "IN" ? ArrowUp : log.type === "OUT" ? ArrowUpRight : RefreshCcw,
      product: log.item,
      quantity: `${log.qty > 0 ? "+" : ""}${log.qty}`,
      warehouse: "Central Store",
      time: log.date,
      user: log.user,
    }));
  }, [dbMovements, movementLogs]);

  const stockInTotal = useMemo(() => {
    let sum = 0;
    dbMovements.forEach((m) => {
      if (m.rawType === "STOCK_IN") {
        sum += Math.abs(Number(String(m.quantity).replace(/[^0-9.-]+/g, "")) || 0);
      }
    });
    inventoryRows.forEach((item) => {
      sum += Number(item.stock) || 0;
    });
    return sum;
  }, [dbMovements, inventoryRows]);

  const stockOutTotal = useMemo(() => {
    let sum = 0;
    dbMovements.forEach((m) => {
      if (m.rawType === "STOCK_OUT") {
        sum += Math.abs(Number(String(m.quantity).replace(/[^0-9.-]+/g, "")) || 0);
      }
    });
    return sum;
  }, [dbMovements]);

  const insightCards = useMemo(() => {
    const lowCount = inventoryRows.filter((i) => i.status === "Low Stock" || i.status === "Out of Stock").length;
    const overstockedCount = inventoryRows.filter((i) => i.stock > 100).length;
    const healthyCount = inventoryRows.filter((i) => i.status === "In Stock").length;

    return [
      {
        title: "Predicted Stock-Outs",
        description: lowCount > 0
          ? `${lowCount} product${lowCount > 1 ? "s" : ""} require reorder soon to prevent stock-out.`
          : "All product stock levels are healthy with zero predicted stock-outs.",
        value: "Review now",
        accent: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200",
        icon: Zap,
      },
      {
        title: "Overstocked Items",
        description: overstockedCount > 0
          ? `${overstockedCount} SKU${overstockedCount > 1 ? "s" : ""} have high stock levels (>100 units).`
          : "No overstocked SKUs detected in active inventory.",
        value: "Optimize levels",
        accent: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-200",
        icon: Layers,
      },
      {
        title: "Active Inventory Health",
        description: healthyCount > 0
          ? `${healthyCount} active product${healthyCount > 1 ? "s" : ""} are in healthy stock condition.`
          : "Add products to monitor catalog stock velocity.",
        value: "Allocate faster",
        accent: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200",
        icon: TrendingUp,
      },
    ];
  }, [inventoryRows]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div
      className={`flex h-screen w-full transition-colors duration-200 ${isDark ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}
    >
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
          onRefresh={fetchInventoryData}
          isLoading={isLoading}
          searchPlaceholder="Search inventory..."
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Inventory</h1>
                <div className="space-y-2">
                  {/* <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Inventory</h1> */}
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Monitor stock levels, warehouse movements, inventory
                    valuation, and product availability in real time.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-700"
                >
                  <PlusCircle size={18} /> Add Inventory
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Upload size={18} /> Import Products
                </button>
                <button
                  onClick={handleExportInventory}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Download size={18} /> Export
                </button>
                <button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition cursor-pointer ${
                    showFilterPanel
                      ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  }`}
                >
                  <Filter size={18} /> Filter
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    title: "Total Items",
                    value: inventoryRows.length.toString(),
                    trend: "+2",
                    icon: Package,
                    accent: "from-sky-500 to-cyan-500",
                  },
                  {
                    title: "In Stock",
                    value: inStockCount.toString(),
                    trend: "+1",
                    icon: Box,
                    accent: "from-emerald-500 to-teal-500",
                  },
                  {
                    title: "Low Stock",
                    value: lowStockCount.toString(),
                    trend: "0",
                    icon: AlertTriangle,
                    accent: "from-amber-500 to-orange-500",
                  },
                  {
                    title: "Out of Stock",
                    value: outOfStockCount.toString(),
                    trend: "0",
                    icon: ShieldCheck,
                    accent: "from-rose-500 to-pink-500",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div
                        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br ${item.accent} text-white shadow-lg shadow-slate-200/40 dark:shadow-none`}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {item.title}
                          </p>
                          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                            {item.value}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {item.trend}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Quick Actions
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Common inventory workflows organized for speed.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  const handleClick = () => {
                    if (action.title === "Add Product") setIsAddModalOpen(true);
                    else if (action.title === "Transfer Stock") {
                      if (inventoryRows.length > 0) setTransferProductId(inventoryRows[0].id);
                      setIsTransferModalOpen(true);
                    } else if (
                      action.title === "Stock Adjustment" ||
                      action.title === "Receive Goods"
                    )
                      handleOpenAdjustmentModal();
                    else if (action.title === "Export Inventory")
                      setIsHistoryModalOpen(true);
                    else setIsAddModalOpen(true);
                  };
                  return (
                    <button
                      key={action.title}
                      onClick={handleClick}
                      className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900 cursor-pointer"
                    >
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm transition group-hover:bg-sky-600 group-hover:text-white dark:bg-slate-900 dark:text-slate-200 dark:group-hover:bg-sky-500">
                        <Icon size={18} />
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">
                        {action.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {action.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="mt-8 grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Inventory Movement
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                      Last 30 Days
                    </h2>
                  </div>
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    <CalendarDays size={16} />
                    <span className="ml-2">Updated daily</span>
                  </div>
                </div>
                <div className="mt-8">
                  <div className="relative h-64 overflow-hidden rounded-[2rem] bg-slate-950/5 p-6 dark:bg-slate-900/60">
                    <svg viewBox="0 0 720 300" className="h-full w-full">
                      <defs>
                        <linearGradient
                          id="lineGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#0ea5e9"
                            stopOpacity="0.9"
                          />
                          <stop
                            offset="100%"
                            stopColor="#0ea5e9"
                            stopOpacity="0.1"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M40 220 C 120 180, 200 160, 280 170 S 440 160, 520 140 S 600 120, 680 90"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M40 230 C 120 200, 200 190, 280 180 S 440 170, 520 150 S 600 130, 680 110"
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="12 10"
                      />
                      <path
                        d="M40 270 C 120 230, 200 220, 280 210 S 440 200, 520 180 S 600 160, 680 150"
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="16"
                        strokeLinecap="round"
                        opacity="0.25"
                      />
                      <g fill="#0f172a" opacity="0.18">
                        {[40, 120, 200, 280, 360, 440, 520, 600, 680].map(
                          (x) => (
                            <circle key={x} cx={x} cy={230 - x / 10} r="18" />
                          ),
                        )}
                      </g>
                    </svg>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Stock In
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                        {stockInTotal.toLocaleString("en-US")}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Stock Out
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                        {stockOutTotal.toLocaleString("en-US")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Low Stock Alerts
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                      Restock Priority
                    </h2>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    {lowStockItems.length} Items Alert
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {lowStockItems.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                      All inventory stock levels are healthy.
                    </div>
                  ) : (
                    lowStockItems.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 transition hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                      >
                        <div className="space-y-1 min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500"></span>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm leading-snug">
                              {item.name}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                            {item.warehouse} • Stock: <span className="font-bold text-amber-600 dark:text-amber-400">{item.stock}</span> (Min: {item.min})
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenAdjustmentModal()}
                            className="rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700 cursor-pointer whitespace-nowrap"
                          >
                            Reorder
                          </button>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${item.status === "Critical" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="grid gap-6 xl:grid-cols-3">
                {warehouses.map((warehouse) => (
                  <div
                    key={warehouse.name}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                          {warehouse.name}
                        </p>
                        <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
                          {warehouse.products}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                        <Truck size={20} />
                      </div>
                    </div>
                    <div className="mt-5 space-y-3 text-sm text-slate-500 dark:text-slate-400">
                      <p>
                        Inventory Value:{" "}
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {warehouse.value}
                        </span>
                      </p>
                      <p>
                        Active Status:{" "}
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {warehouse.status}
                        </span>
                      </p>
                    </div>
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                        <span>Capacity Usage</span>
                        <span>{warehouse.usage}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-sky-600 transition"
                          style={{ width: `${warehouse.usage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Recent Inventory Activities
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                      Activity Timeline
                    </h2>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    See all
                  </button>
                </div>
                <div className="mt-6 space-y-4">
                  {activities.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                      No recent inventory movements recorded.
                    </div>
                  ) : (
                    activities.map((activity, idx) => {
                      const Icon = activity.icon || ArrowUp;
                      return (
                        <div
                          key={activity.id || `${activity.product}-${idx}`}
                          className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                        >
                          <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-900 text-white dark:bg-slate-700 shrink-0">
                            {Icon && <Icon size={20} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {activity.type || "Stock Activity"}
                              </span>
                              <span>•</span>
                              <span>{activity.time || "Recently"}</span>
                            </div>
                            <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white truncate">
                              {activity.product || "Product Item"}
                            </p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {activity.quantity || "0"} in {activity.warehouse || "Central Store"} • by {activity.user || "Admin"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Inventory Insights
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                      AI-Powered Recommendations
                    </h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    <Zap size={16} /> Predictive analysis
                  </div>
                </div>
                <div className="mt-6 grid gap-4">
                  {insightCards.map((insight) => {
                    const Icon = insight.icon;
                    return (
                      <div
                        key={insight.title}
                        className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 ${insight.accent}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
                            {Icon && <Icon size={20} />}
                          </div>
                          <div>
                            <p className="text-base font-semibold text-slate-950 dark:text-white">
                              {insight.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {insight.description}
                            </p>
                          </div>
                        </div>
                        <p className="mt-5 text-sm font-semibold text-sky-700 dark:text-sky-300">
                          {insight.value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <section className="mt-8">
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Inventory Table
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Enterprise-grade stock data with real-time search and multi-column filtering.
                      </p>
                    </div>
                  </div>

                  {/* Filter Bar Panel */}
                  {showFilterPanel && (
                    <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-500">Search Keyword</Label>
                        <Input
                          placeholder="Search product or SKU..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="mt-1.5 h-9 rounded-xl border-slate-200 text-xs dark:border-slate-800"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-500">Category</Label>
                        <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "All")}>
                          <SelectTrigger className="mt-1.5 h-9 rounded-xl border-slate-200 text-xs dark:border-slate-800">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All Categories</SelectItem>
                            {categoriesList.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-500">Warehouse</Label>
                        <Select value={warehouseFilter} onValueChange={(val) => setWarehouseFilter(val || "All")}>
                          <SelectTrigger className="mt-1.5 h-9 rounded-xl border-slate-200 text-xs dark:border-slate-800">
                            <SelectValue placeholder="All Warehouses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All Warehouses</SelectItem>
                            {warehousesList.map((wh) => (
                              <SelectItem key={wh} value={wh}>{wh}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-500">Stock Status</Label>
                        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "All")}>
                          <SelectTrigger className="mt-1.5 h-9 rounded-xl border-slate-200 text-xs dark:border-slate-800">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            <SelectItem value="In Stock">In Stock</SelectItem>
                            <SelectItem value="Low Stock">Low Stock</SelectItem>
                            <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-700 dark:text-slate-200">
                      <thead className="bg-slate-100 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                        <tr>
                          <th className="sticky top-0 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                          </th>
                          <th className="sticky top-0 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            Product
                          </th>
                          <th className="sticky top-0 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            SKU
                          </th>
                          <th className="sticky top-0 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            Category
                          </th>
                          <th className="sticky top-0 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            Warehouse
                          </th>
                          <th className="sticky top-0 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            Current Stock
                          </th>
                          <th className="sticky top-0 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            Reserved
                          </th>
                          <th className="sticky top-0 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            Available
                          </th>
                          <th className="sticky top-0 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            Unit Cost
                          </th>
                          <th className="sticky top-0 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            Selling Price
                          </th>
                          <th className="sticky top-0 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            Status
                          </th>
                          <th className="sticky top-0 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            Last Updated
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventory.length === 0 ? (
                          <tr>
                            <td colSpan={12} className="px-4 py-12 text-center text-sm text-slate-500">
                              Tidak ada produk inventaris yang cocok dengan filter.
                            </td>
                          </tr>
                        ) : (
                          filteredInventory.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-slate-200 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
                            >
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                />
                              </td>
                              <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">
                                {row.product}
                              </td>
                              <td className="px-4 py-4">{row.sku}</td>
                              <td className="px-4 py-4">{row.category}</td>
                              <td className="px-4 py-4">{row.warehouse}</td>
                              <td className="px-4 py-4">{row.stock}</td>
                              <td className="px-4 py-4">{row.reserved}</td>
                              <td className="px-4 py-4">{row.available}</td>
                              <td className="px-4 py-4">{formatPrice(row.cost)}</td>
                              <td className="px-4 py-4">{formatPrice(row.price)}</td>
                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(row.status)}`}
                                >
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-4 py-4">{row.updated}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Showing {filteredInventory.length} of {inventoryRows.length} items
                    </p>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 p-2 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                      <button className="rounded-2xl px-3 py-2 transition hover:bg-slate-200 dark:hover:bg-slate-800">
                        Prev
                      </button>
                      <span>1</span>
                      <button className="rounded-2xl px-3 py-2 transition hover:bg-slate-200 dark:hover:bg-slate-800">
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-8 grid gap-6 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Top Selling Products
                    </p>
                  </div>
                  <ArrowRightCircle size={20} className="text-slate-400" />
                </div>
                <div className="mt-6 space-y-4">
                  {topSelling.map((item) => (
                    <div
                      key={item.name}
                      className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950"
                    >
                      <p className="font-semibold text-slate-950 dark:text-white">
                        {item.name}
                      </p>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Units sold: {item.units}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Revenue: {item.revenue}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Recently Added Products
                    </p>
                  </div>
                  <ArrowRightCircle size={20} className="text-slate-400" />
                </div>
                <div className="mt-6 space-y-4">
                  {recentProducts.map((item) => (
                    <div
                      key={item.name}
                      className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950"
                    >
                      <p className="font-semibold text-slate-950 dark:text-white">
                        {item.name}
                      </p>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Category: {item.category}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Added: {item.date}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Upcoming Restocks
                    </p>
                  </div>
                  <ArrowRightCircle size={20} className="text-slate-400" />
                </div>
                <div className="mt-6 space-y-4">
                  {restocks.map((item) => (
                    <div
                      key={item.name}
                      className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950"
                    >
                      <p className="font-semibold text-slate-950 dark:text-white">
                        {item.name}
                      </p>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Expected: {item.arrival}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Supplier: {item.supplier}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* POPUP 1  */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 sm:max-w-2xl">
          {/* Header Banner */}
          <div className="relative bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Add New Inventory Item
                </h2>
                <p className="mt-0.5 text-xs text-sky-100 opacity-90 sm:text-sm">
                  Register a new product with stock, pricing, and warehouse
                  mapping
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  handleResetForm();
                }}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="mt-6 flex gap-2 rounded-2xl bg-black/20 p-1.5 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setActiveModalTab("basic")}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
                  activeModalTab === "basic"
                    ? "bg-white text-sky-700 shadow dark:bg-slate-900 dark:text-sky-300"
                    : "text-white/80 hover:text-white"
                }`}
              >
                1. Basic Info
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("stock")}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
                  activeModalTab === "stock"
                    ? "bg-white text-sky-700 shadow dark:bg-slate-900 dark:text-sky-300"
                    : "text-white/80 hover:text-white"
                }`}
              >
                2. Stock & Warehouse
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("pricing")}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
                  activeModalTab === "pricing"
                    ? "bg-white text-sky-700 shadow dark:bg-slate-900 dark:text-sky-300"
                    : "text-white/80 hover:text-white"
                }`}
              >
                3. Pricing & Valuation
              </button>
            </div>
          </div>

          {/* Modal Form Body */}
          <form onSubmit={handleSaveInventory} className="p-6 space-y-6">
            {/* TAB 1: BASIC INFO */}
            {activeModalTab === "basic" && (
              <div className="space-y-4">
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Ergonomic Standing Desk"
                    value={formData.product}
                    onChange={(e) =>
                      handleInputChange("product", e.target.value)
                    }
                    disabled={isSubmitting}
                    className="h-11 rounded-2xl border-slate-200 focus:ring-2 focus:ring-sky-500 dark:border-slate-800 dark:bg-slate-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        SKU Code <span className="text-red-500">*</span>
                      </Label>
                      <button
                        type="button"
                        onClick={handleAutoGenerateSku}
                        className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer"
                      >
                        Auto Generate SKU
                      </button>
                    </div>
                    <Input
                      placeholder="e.g. DSK-2026-904"
                      value={formData.sku}
                      onChange={(e) => handleInputChange("sku", e.target.value)}
                      disabled={isSubmitting}
                      className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Office Furniture"
                      value={formData.category}
                      onChange={(e) =>
                        handleInputChange("category", e.target.value)
                      }
                      disabled={isSubmitting}
                      className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: STOCK & WAREHOUSE */}
            {activeModalTab === "stock" && (
              <div className="space-y-4">
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Warehouse Location <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.warehouse || "Central Store"}
                    onValueChange={(val) => handleInputChange("warehouse", val)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Central Store">
                        Central Store (Headquarters)
                      </SelectItem>
                      <SelectItem value="West DC">
                        West DC (Distribution Center)
                      </SelectItem>
                      <SelectItem value="North Hub">
                        North Hub (Logistics)
                      </SelectItem>
                      <SelectItem value="East DC">
                        East DC (Overstock)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Initial Stock <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.stock || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "stock",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      disabled={isSubmitting}
                      className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Reserved Stock
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.reserved || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "reserved",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      disabled={isSubmitting}
                      className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                    />
                  </div>
                </div>

                {/* Available Stock Indicator Box */}
                <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-500/20 dark:bg-sky-950/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-sky-800 dark:text-sky-300">
                        Net Available Stock
                      </p>
                      <p className="mt-0.5 text-xl font-bold text-sky-950 dark:text-white">
                        {Math.max(0, formData.stock - formData.reserved)} units
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        formData.stock > 10
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {formData.stock > 10 ? "Healthy Level" : "Low Buffer"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PRICING & VALUATION */}
            {activeModalTab === "pricing" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Unit Cost ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.cost || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "cost",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      disabled={isSubmitting}
                      className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Selling Price ($) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "price",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      disabled={isSubmitting}
                      className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                      required
                    />
                  </div>
                </div>

                {/* Financial Summary Card */}
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Total Inventory Valuation
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                      $
                      {(
                        (formData.stock || 0) * (formData.cost || 0)
                      ).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Est. Profit Margin
                    </p>
                    <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formData.price > 0
                        ? (
                            ((formData.price - (formData.cost || 0)) /
                              formData.price) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {activeModalTab !== "basic" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setActiveModalTab(
                        activeModalTab === "pricing" ? "stock" : "basic",
                      )
                    }
                    className="rounded-2xl border-slate-200 dark:border-slate-800"
                  >
                    Back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    handleResetForm();
                  }}
                  disabled={isSubmitting}
                  className="rounded-2xl border-slate-200 dark:border-slate-800"
                >
                  Cancel
                </Button>

                {activeModalTab !== "pricing" ? (
                  <Button
                    type="button"
                    onClick={() =>
                      setActiveModalTab(
                        activeModalTab === "basic" ? "stock" : "pricing",
                      )
                    }
                    className="rounded-2xl bg-sky-600 text-white hover:bg-sky-700"
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-2xl bg-sky-600 text-white hover:bg-sky-700"
                  >
                    {isSubmitting ? "Saving..." : "Save Inventory Item"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* ========================================================================= */}
      {/* POPUP 2: REDESIGNED "STOCK ADJUSTMENT & MOVEMENT" MODAL (TEXT ONLY)       */}
      {/* ========================================================================= */}
      <Dialog
        open={isAdjustmentModalOpen}
        onOpenChange={setIsAdjustmentModalOpen}
      >
        <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Stock Adjustment
                </h2>
                <p className="text-xs text-slate-300">
                  Record inventory in, out, or physical stock count
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Operation Mode Selector Pills */}
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-black/30 p-1.5 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setAdjustmentType("IN")}
                className={`rounded-xl py-2 text-xs font-semibold transition ${
                  adjustmentType === "IN"
                    ? "bg-emerald-500 text-white shadow-md"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Stock In (+)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("OUT")}
                className={`rounded-xl py-2 text-xs font-semibold transition ${
                  adjustmentType === "OUT"
                    ? "bg-rose-500 text-white shadow-md"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Stock Out (-)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("ADJUST")}
                className={`rounded-xl py-2 text-xs font-semibold transition ${
                  adjustmentType === "ADJUST"
                    ? "bg-sky-500 text-white shadow-md"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Set Exact (=)
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveStockAdjustment} className="p-6 space-y-5">
            {/* Target Product Selector Dropdown */}
            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Select Target Product
              </Label>
              <Select
                value={selectedItem?.id || ""}
                onValueChange={(val) => {
                  const found = inventoryRows.find((item) => item.id === val);
                  if (found) setSelectedItem(found);
                }}
              >
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 text-sm font-semibold">
                  <SelectValue placeholder="Choose a product to adjust stock..." />
                </SelectTrigger>
                <SelectContent>
                  {inventoryRows.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.product} (Stok: {item.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Product Details Card */}
            {selectedItem && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedItem.product}
                    </p>
                    <p className="text-slate-500">
                      SKU: {selectedItem.sku} • {selectedItem.warehouse}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">Current Stock</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedItem.stock} units
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity Input with Live Math Preview */}
            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {adjustmentType === "IN"
                  ? "Quantity to Add"
                  : adjustmentType === "OUT"
                    ? "Quantity to Remove"
                    : "New Physical Stock Count"}
              </Label>
              <Input
                type="number"
                min="1"
                value={adjustmentQty || ""}
                onChange={(e) =>
                  setAdjustmentQty(parseInt(e.target.value) || 0)
                }
                className="h-12 text-lg font-bold rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                required
              />
            </div>

            {/* Reason Quick-Select Chips */}
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Adjustment Reason
              </Label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Stock Audit",
                  "Purchase Order",
                  "Damaged Goods",
                  "Customer Return",
                  "Warehouse Transfer",
                ].map((reason) => (
                  <button
                    type="button"
                    key={reason}
                    onClick={() => setAdjustmentReason(reason)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      adjustmentReason === reason
                        ? "bg-sky-600 text-white dark:bg-sky-500"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Calculation Preview Banner */}
            {selectedItem && (
              <div className="rounded-2xl bg-sky-50/70 p-4 border border-sky-200 dark:bg-sky-950/30 dark:border-sky-800/40">
                <div className="flex items-center justify-between text-xs text-sky-900 dark:text-sky-200">
                  <span>
                    Current: <strong>{selectedItem.stock}</strong>
                  </span>
                  <span>
                    Operation:{" "}
                    <strong>
                      {adjustmentType === "IN"
                        ? `+${adjustmentQty}`
                        : adjustmentType === "OUT"
                          ? `-${adjustmentQty}`
                          : `Set ${adjustmentQty}`}
                    </strong>
                  </span>
                  <span>
                    New Total:{" "}
                    <strong className="text-sm font-bold text-sky-700 dark:text-sky-300">
                      {adjustmentType === "IN"
                        ? selectedItem.stock + adjustmentQty
                        : adjustmentType === "OUT"
                          ? Math.max(0, selectedItem.stock - adjustmentQty)
                          : adjustmentQty}{" "}
                      units
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="flex-1 rounded-2xl border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-sky-600 text-white hover:bg-sky-700"
              >
                {isSubmitting ? "Processing..." : "Confirm Movement"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* POPUP 3: MOVEMENT HISTORY & AUDIT LOG MODAL (TEXT ONLY)                   */}
      {/* ========================================================================= */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                Stock Movement Audit Log
              </h2>
              <p className="text-xs text-slate-400">
                Recent inventory transactions and physical counts
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(false)}
              className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
            {movementLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex px-3 py-1.5 rounded-xl font-bold text-xs ${
                      log.type === "IN"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : log.type === "OUT"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                    }`}
                  >
                    {log.type === "IN"
                      ? "+IN"
                      : log.type === "OUT"
                        ? "-OUT"
                        : "=SET"}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {log.item}
                    </p>
                    <p className="text-xs text-slate-500">
                      {log.reason} • by {log.user}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${log.qty > 0 ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {log.qty > 0 ? `+${log.qty}` : log.qty} units
                  </p>
                  <p className="text-xs text-slate-400">{log.date}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 p-4 dark:border-slate-800 text-right">
            <Button
              onClick={() => setIsHistoryModalOpen(false)}
              className="rounded-2xl bg-slate-900 text-white dark:bg-slate-800"
            >
              Close Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* POPUP 4: IMPORT PRODUCTS MODAL (CSV UPLOAD & TEXT PARSER)                 */}
      {/* ========================================================================= */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                Import Products via CSV
              </h2>
              <p className="text-xs text-sky-100 opacity-90 mt-0.5">
                Bulk upload catalog items using a standard CSV file or text template.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadSampleCSV}
              className="rounded-xl text-xs bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white transition cursor-pointer"
            >
              <Download size={14} className="mr-1.5" /> Sample Template
            </Button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                1. Upload CSV File
              </Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mt-1.5 h-10 rounded-xl text-xs cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  2. Or Paste CSV Raw Text
                </Label>
                <span className="text-[10px] text-slate-400">
                  Header: Name, SKU, Category, Warehouse, Stock, CostPrice, SellingPrice
                </span>
              </div>
              <textarea
                rows={6}
                value={importCsvText}
                onChange={(e) => setImportCsvText(e.target.value)}
                placeholder="Name, SKU, Category, Warehouse, Stock, CostPrice, SellingPrice&#10;Laptop Asus, LAP-001, Electronics, Central Store, 25, 450, 600&#10;Mouse Wireless, MOU-002, Accessories, Central Store, 100, 10, 20"
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImportModalOpen(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isImporting}
              onClick={handleProcessImportCSV}
              className="rounded-2xl bg-sky-600 text-white hover:bg-sky-700"
            >
              {isImporting ? "Importing..." : "Start Import"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MULTI-WAREHOUSE STOCK TRANSFER MODAL */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Truck className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">Transfer Stok Antar Gudang</h2>
                <p className="text-xs text-sky-100 opacity-90">Pindahkan persediaan barang & terbitkan Surat Jalan Pemindahan</p>
              </div>
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!transferProductId || !transferQuantity) {
                alert("Pilih Produk dan Jumlah Transfer!");
                return;
              }

              setIsTransferring(true);
              try {
                const { transferStockBetweenWarehouses } = await import("@/app/actions/inventory");
                const res = await transferStockBetweenWarehouses({
                  productId: transferProductId,
                  sourceWarehouse: transferSourceWarehouse,
                  targetWarehouse: transferTargetWarehouse,
                  quantity: Number(transferQuantity),
                  notes: transferNotes,
                });

                if (res.success && res.details) {
                  setIsTransferModalOpen(false);
                  setWaybillDetails(res.details);
                  setTransferQuantity("");
                  setTransferNotes("");
                  fetchInventoryData();
                } else {
                  alert(res.error || "Gagal melakukan transfer stok.");
                }
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                alert(`Error saat transfer stok: ${msg}`);
              } finally {
                setIsTransferring(false);
              }
            }}
            className="p-6 space-y-4 text-xs"
          >
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 dark:text-slate-300">Pilih Produk *</Label>
              <select
                value={transferProductId}
                onChange={(e) => setTransferProductId(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                required
              >
                {inventoryRows.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.product} (SKU: {item.sku}) - Sisa Stok: {item.stock} pcs [{item.warehouse}]
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Gudang Asal *</Label>
                <select
                  value={transferSourceWarehouse}
                  onChange={(e) => setTransferSourceWarehouse(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="Gudang Utama">Gudang Utama</option>
                  <option value="Gudang Jakarta">Gudang Jakarta</option>
                  <option value="Gudang Surabaya">Gudang Surabaya</option>
                  <option value="Gudang Medan">Gudang Medan</option>
                  <option value="Central Store">Central Store</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Gudang Tujuan *</Label>
                <select
                  value={transferTargetWarehouse}
                  onChange={(e) => setTransferTargetWarehouse(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="Gudang Jakarta">Gudang Jakarta</option>
                  <option value="Gudang Surabaya">Gudang Surabaya</option>
                  <option value="Gudang Utama">Gudang Utama</option>
                  <option value="Gudang Medan">Gudang Medan</option>
                  <option value="Central Store">Central Store</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 dark:text-slate-300">Jumlah Transfer (Pcs) *</Label>
              <Input
                type="number"
                min={1}
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(e.target.value)}
                placeholder="Contoh: 50"
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 dark:text-slate-300">Catatan / Instruksi Pengiriman</Label>
              <textarea
                rows={2}
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Contoh: Pengiriman via Kurir Logistik Internal Rute 2"
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTransferModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isTransferring}
                className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold"
              >
                {isTransferring ? "Processing..." : "Transfer & Terbitkan Surat Jalan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* POPUP SURAT JALAN PEMINDAHAN STOK (WAYBILL VIEW) */}
      <Dialog open={Boolean(waybillDetails)} onOpenChange={() => setWaybillDetails(null)}>
        <DialogContent className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          {waybillDetails && (
            <div className="space-y-4">
              <div className="border-b border-sky-500 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-sky-600">SURAT JALAN PEMINDAHAN</h3>
                  <p className="text-[11px] text-slate-400 font-mono">No: {waybillDetails.waybillNumber}</p>
                </div>
                <Truck className="h-7 w-7 text-sky-600 opacity-80" />
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Surat Jalan:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{waybillDetails.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gudang Asal:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{waybillDetails.sourceWarehouse}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gudang Tujuan:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{waybillDetails.targetWarehouse}</span>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">{waybillDetails.productName}</div>
                <div className="text-slate-400 font-mono text-[11px]">SKU: {waybillDetails.sku}</div>
                <div className="pt-2 flex justify-between border-t border-slate-100 dark:border-slate-800 font-semibold">
                  <span>Jumlah Barang Ditransfer:</span>
                  <span className="text-sky-600 font-bold">{waybillDetails.quantity} Pcs</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  onClick={() => window.print()}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold"
                >
                  Cetak Surat Jalan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setWaybillDetails(null)}
                  className="rounded-xl text-xs"
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
