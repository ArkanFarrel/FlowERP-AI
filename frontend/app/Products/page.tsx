'use client';
import Sidebar from '@/components/ui/layout/sidebar';
import Topbar from '@/components/ui/layout/topbar';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProducts, createProduct, deleteProduct } from '@/app/actions/products';
import { useUser } from '@/hooks/useUser';
import {
  Search,
  Plus,
  FileText,
  UploadCloud,
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ProductStatus = 'Active' | 'Low Stock' | 'Out of Stock';

type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  price: string;
  status: ProductStatus;
  image: string;
};

interface ProductFormData {
  productName: string;
  sku: string;
  barcode?: string;
  category?: string;
  brand?: string;
  unit?: string;
  description?: string;
  productImage?: File;
  costPrice?: number;
  sellingPrice?: number;
  tax?: number;
  discount?: number;
  openingStock?: number;
  reservedStock?: number;
  minimumStock?: number;
  maximumStock?: number;
  warehouse?: string;
  rackLocation?: string;
  status: 'active' | 'draft' | 'inactive';
  supplier?: string;
  supplierCode?: string;
  tags?: string[];
  trackInventory: boolean;
  allowNegativeStock: boolean;
  featuredProduct: boolean;
}

const categories = ['All Categories', 'Hardware', 'Software', 'Accessories', 'Services'];
const statuses = ['All Status', 'Active', 'Low Stock', 'Out of Stock'];
const sortOptions = [
  { value: 'Newest', label: 'Newest' },
  { value: 'PriceLow', label: 'Price: Low to High' },
  { value: 'PriceHigh', label: 'Price: High to Low' },
  { value: 'StockLow', label: 'Stock: Low to High' },
];

const statusStyles: Record<ProductStatus, string> = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Low Stock': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Out of Stock': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

function formatPrice(value: string) {
  return value;
}

/**
 * Helper function untuk menentukan status produk berdasarkan stock
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function determineProductStatus(stock: number): ProductStatus {
  if (stock === 0) {
    return 'Out of Stock';
  } else if (stock <= 15) {
    return 'Low Stock';
  }
  return 'Active';
}

/**
 * Helper function untuk generate Product ID
 */
// function generateProductId(): string {
//   return `p${Date.now()}`;
// }

export default function ProductsPage() {
  const user = useUser();
  const userRole = (user.role || 'OWNER').toUpperCase();
  const canDeleteProduct = ['OWNER', 'ADMIN', 'MANAGER'].includes(userRole);

  const [productList, setProductList] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [status, setStatus] = useState('All Statuses');
  const [sort, setSort] = useState('Newest');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    productName: '',
    sku: '',
    barcode: '',
    category: '',
    brand: '',
    unit: '',
    description: '',
    costPrice: undefined,
    sellingPrice: undefined,
    tax: undefined,
    discount: undefined,
    openingStock: undefined,
    minimumStock: undefined,
    maximumStock: undefined,
    warehouse: '',
    rackLocation: '',
    status: 'draft',
    supplier: '',
    supplierCode: '',
    tags: [],
    trackInventory: true,
    allowNegativeStock: false,
    featuredProduct: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAutoGenerateSku = () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const categoryPrefix = (formData.category || 'PRD').slice(0, 3).toUpperCase();
    const newSku = `${categoryPrefix}-${new Date().getFullYear()}-${randomCode}`;
    setFormData((prev) => ({ ...prev, sku: newSku }));
  };

  const fetchProducts = () => {
    setIsLoading(true);
    getProducts()
      .then((res) => {
        if (res && res.success && Array.isArray(res.data)) {
          setProductList(res.data as unknown as Product[]);
        }
      })
      .catch((err: unknown) => console.warn('Error fetching products:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
  }, []);

  const handleDeleteProduct = async (id: string) => {
    if (!canDeleteProduct) {
      alert("Akses Ditolak: Peran (Role) Anda tidak memiliki izin untuk menghapus produk dari katalog.");
      return;
    }

    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      try {
        const res = await deleteProduct(id);
        if (res.success) {
          setProductList((prev) => prev.filter((p) => p.id !== id));
        } else {
          alert(res.error || 'Akses ditolak: Anda tidak memiliki izin untuk menghapus produk.');
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Gagal menghapus produk.';
        alert(errorMsg);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/Login');
  };

  const handleInputChange = (field: keyof ProductFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetForm = () => {
    setFormData({
      productName: '',
      sku: '',
      barcode: '',
      category: '',
      brand: '',
      unit: '',
      description: '',
      costPrice: undefined,
      sellingPrice: undefined,
      tax: undefined,
      discount: undefined,
      openingStock: undefined,
      minimumStock: undefined,
      maximumStock: undefined,
      warehouse: '',
      rackLocation: '',
      status: 'draft',
      supplier: '',
      supplierCode: '',
      tags: [],
      trackInventory: true,
      allowNegativeStock: false,
      featuredProduct: false,
    });
  };

  const handleSaveProduct = useCallback(
    async () => {
      if (!formData.productName || !formData.sku) {
        alert('Product name and SKU are required');
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = {
          name: formData.productName,
          sku: formData.sku,
          barcode: formData.barcode,
          categoryName: formData.category || 'Hardware',
          costPrice: Number(formData.costPrice) || 0,
          sellingPrice: Number(formData.sellingPrice) || 0,
          stock: Number(formData.openingStock) || 0,
          minStock: Number(formData.minimumStock) || 5,
          maxStock: Number(formData.maximumStock) || 100,
          unit: formData.unit || 'pcs',
          warehouse: formData.warehouse || 'Central Store',
          description: formData.description,
        };

        const res = await createProduct(payload);
        if (res.success) {
          fetchProducts();
          setIsAddModalOpen(false);
          handleResetForm();
        } else {
          alert(res.error || 'Failed to save product');
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to save product';
        alert(errorMsg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData]
  );

  const filteredProducts = useMemo(() => {
    let results = [...productList];

    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        (product) =>
          product.name.toLowerCase().includes(lowerQuery) ||
          product.sku.toLowerCase().includes(lowerQuery) ||
          product.category.toLowerCase().includes(lowerQuery),
      );
    }

    if (category !== 'All Categories') {
      results = results.filter((product) => product.category === category);
    }

    if (status !== 'All Statuses') {
      results = results.filter((product) => product.status === status);
    }

    if (sort === 'PriceLow') {
      results.sort((a, b) => parseFloat(a.price.replace(/[$,]/g, '')) - parseFloat(b.price.replace(/[$,]/g, '')));
    } else if (sort === 'PriceHigh') {
      results.sort((a, b) => parseFloat(b.price.replace(/[$,]/g, '')) - parseFloat(a.price.replace(/[$,]/g, '')));
    } else if (sort === 'StockLow') {
      results.sort((a, b) => a.stock - b.stock);
    }

    return results;
  }, [productList, query, category, status, sort]);

  const totalProducts = productList.length;
  const activeProducts = productList.filter((product) => product.status === 'Active').length;
  const lowStockProducts = productList.filter((product) => product.status === 'Low Stock').length;
  const outOfStockProducts = productList.filter((product) => product.status === 'Out of Stock').length;

  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);
  const showingFrom = filteredProducts.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, filteredProducts.length);

  const handleExportCSV = () => {
    const dataToExport = filteredProducts.length > 0 ? filteredProducts : productList;
    if (dataToExport.length === 0) {
      alert('No product data available to export.');
      return;
    }

    const headers = ['Product Name', 'SKU', 'Category', 'Stock', 'Price', 'Status', 'Product ID'];
    const csvRows = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...dataToExport.map((product) => {
        const escapeCSV = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;
        return [
          escapeCSV(product.name),
          escapeCSV(product.sku),
          escapeCSV(product.category),
          product.stock,
          escapeCSV(product.price),
          escapeCSV(product.status),
          escapeCSV(product.id),
        ].join(',');
      }),
    ];

    // UTF-8 BOM (\uFEFF) forces Excel to open the file with separate columns cleanly
    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `products_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          onRefresh={fetchProducts}
          isLoading={isLoading}
          searchValue={query}
          onSearchChange={setQuery}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <div className="p-8">
            {/* Header */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none sm:p-8 mb-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Products
                  </p>
                  <div className="space-y-1">
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                      Products
                    </h1>
                    <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                      Manage your products and inventory with an ERP grade product catalog and stock control.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 cursor-pointer"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fileInput = document.createElement('input');
                      fileInput.type = 'file';
                      fileInput.accept = '.csv';
                      fileInput.onchange = async (e: Event) => {
                        const target = e.target as HTMLInputElement;
                        if (target.files && target.files[0]) {
                          const file = target.files[0];
                          const text = await file.text();
                          import('@/lib/export').then(async ({ parseAndValidateCSV }) => {
                            const result = parseAndValidateCSV(text, [
                              { key: 'name', label: 'Product Name', type: 'string' },
                              { key: 'sku', label: 'SKU', type: 'string' },
                              { key: 'stock', label: 'Stock', type: 'number' },
                              { key: 'sellingPrice', label: 'Price', type: 'number' },
                            ]);

                            if (!result.success && result.errors.length > 0) {
                              const errMsgs = result.errors.map(err => `Baris ${err.rowNumber}: [${err.field}] ${err.message}`).join('\n');
                              alert(`Gagal Impor CSV! Ditemukan kesalahan validasi data:\n\n${errMsgs}`);
                              return;
                            }

                            if (result.validRows.length === 0) {
                              alert('Tidak ada baris data valid yang dapat diimpor.');
                              return;
                            }

                            // Import valid items
                            let importedCount = 0;
                            for (const row of result.validRows) {
                              try {
                                await createProduct({
                                  name: String(row.name),
                                  sku: String(row.sku),
                                  categoryName: 'Hardware',
                                  sellingPrice: Number(row.sellingPrice) || 0,
                                  stock: Number(row.stock) || 0,
                                });
                                importedCount++;
                              } catch {
                                // continue
                              }
                            }

                            alert(`Berhasil mengimpor ${importedCount} produk tanpa error!`);
                            fetchProducts();
                          });
                        }
                      };
                      fileInput.click();
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 cursor-pointer"
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Import CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition hover:bg-sky-700 cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
              {[
                {
                  label: 'Total Products',
                  value: totalProducts,
                  icon: Package,
                  iconBg: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300',
                },
                {
                  label: 'Active Products',
                  value: activeProducts,
                  icon: CheckCircle2,
                  iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
                },
                {
                  label: 'Low Stock',
                  value: lowStockProducts,
                  icon: AlertTriangle,
                  iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
                },
                {
                  label: 'Out of Stock',
                  value: outOfStockProducts,
                  icon: XCircle,
                  iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                        <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
                          {stat.value}
                        </p>
                      </div>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-3xl ${stat.iconBg}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Products Table */}
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
              <div className="space-y-4 border-b border-slate-200/80 px-5 py-5 dark:border-slate-800">
                <div className="grid gap-4 md:grid-cols-4">
                  <label className="relative block w-full">
                    <span className="sr-only">Search</span>
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Search products"
                      className=" mt-2.5 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-700 dark:focus:ring-slate-700"
                    />
                  </label>

                  <select
                    value={category}
                    onChange={(event) => {
                      setCategory(event.target.value);
                      setPage(1);
                    }}
                    // className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-700 dark:focus:ring-slate-700"
                  >
                    {categories.map((option) => (
                      <option key={option} value={option} className="bg-white dark:bg-slate-950">
                        {option}
                      </option>
                    ))}
                  </select>

                  <select
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value);
                      setPage(1);
                    }}
                    // className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-700 dark:focus:ring-slate-700"
                  >
                    {statuses.map((option) => (
                      <option key={option} value={option} className="bg-white dark:bg-slate-950">
                        {option}
                      </option>
                    ))}
                  </select>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                      // className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-700 dark:focus:ring-slate-700"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value} className="bg-white dark:bg-slate-950">
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setCategory('All Categories');
                        setStatus('All Statuses');
                        setSort('Newest');
                        setPage(1);
                      }}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Reset Filter
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto px-5 pb-5 pt-3">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
                  <thead className="border-b border-slate-200/80 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="px-4 py-4 font-medium">
                        Product
                      </th>
                      <th scope="col" className="px-4 py-4 font-medium">
                        SKU
                      </th>
                      <th scope="col" className="px-4 py-4 font-medium">
                        Category
                      </th>
                      <th scope="col" className="px-4 py-4 font-medium">
                        Stock
                      </th>
                      <th scope="col" className="px-4 py-4 font-medium">
                        Selling Price
                      </th>
                      <th scope="col" className="px-4 py-4 font-medium">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-4 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {currentProducts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                        >
                          No products match the current filter.
                        </td>
                      </tr>
                    ) : (
                      currentProducts.map((product) => (
                        <tr key={product.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-900/80">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">{product.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{product.image}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{product.sku}</td>
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{product.category}</td>
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{product.stock}</td>
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                            {formatPrice(product.price)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[product.status]}`}
                            >
                              {product.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="relative inline-flex items-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMenuId(openMenuId === product.id ? null : product.id)
                                }
                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                                aria-expanded={openMenuId === product.id}
                                aria-haspopup="true"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                              {openMenuId === product.id ? (
                                <div className="absolute right-0 top-full z-10 mt-2 w-44 rounded-3xl border border-slate-200 bg-white px-3 py-2 shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-950 dark:shadow-slate-950/20">
                                  <button
                                    type="button"
                                    className="flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                                  >
                                    View Product
                                  </button>
                                  <button
                                    type="button"
                                    className="mt-1 flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                                  >
                                    Edit
                                  </button>
                                  {canDeleteProduct ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        handleDeleteProduct(product.id);
                                      }}
                                      className="mt-1 flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 cursor-pointer"
                                    >
                                      Delete Product
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-200/80 px-5 py-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Showing <span className="font-semibold text-slate-900 dark:text-white">{showingFrom}</span>–
                  <span className="font-semibold text-slate-900 dark:text-white">{showingTo}</span> of{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">{filteredProducts.length}</span>{' '}
                  products
                </p>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    disabled={page === 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-8 text-center font-medium text-slate-900 dark:text-white">
                    {page}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(current + 1, pageCount))}
                    disabled={page === pageCount}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-8 border-t border-gray-200 dark:border-gray-800 mt-8">
              <div className="flex gap-6">
                <span>Version 1.0.0</span>
                <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300">
                  Terms of Service
                </a>
              </div>
              <span>© 2026 FlowERP. All rights reserved.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6-FIELD "ADD NEW PRODUCT" MODAL (TEXT ONLY)                                */}
      {/* ========================================================================= */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          {/* Header Banner */}
          <div className="bg-sky-600 p-6 text-white dark:bg-sky-950 border-b border-sky-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Add New Product</h2>
                <p className="mt-0.5 text-xs text-sky-100 opacity-90">Fill in product details to register in catalog</p>
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
          </div>

          {/* Modal Form Body: Exact 6 Fields */}
          <div className="p-6 space-y-4">
            {/* 1. Product Name */}
            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Product <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Ergonomic Office Desk"
                value={formData.productName}
                onChange={(e) => handleInputChange('productName', e.target.value)}
                disabled={isSubmitting}
                className="h-11 rounded-2xl border-slate-200 focus:ring-2 focus:ring-sky-500 dark:border-slate-800 dark:bg-slate-900"
                required
              />
            </div>

            {/* 2. SKU & 3. Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    SKU <span className="text-red-500">*</span>
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
                  placeholder="e.g. PRD-2026-108"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
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
                  value={formData.category || ''}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                  required
                />
              </div>
            </div>

            {/* 4. Stock & 5. Selling Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Stock <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.openingStock || ''}
                  onChange={(e) => handleInputChange('openingStock', e.target.value ? parseInt(e.target.value) : undefined)}
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                  required
                />
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Selling Price <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.sellingPrice || ''}
                  onChange={(e) => handleInputChange('sellingPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                  disabled={isSubmitting}
                  className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                  required
                />
              </div>
            </div>

            {/* 6. Status */}
            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value as 'active' | 'draft' | 'inactive')}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddModalOpen(false);
                  handleResetForm();
                }}
                disabled={isSubmitting}
                className="flex-1 rounded-2xl border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleSaveProduct()}
                disabled={isSubmitting || !formData.productName || !formData.sku}
                className="flex-1 rounded-2xl bg-sky-600 text-white hover:bg-sky-700"
              >
                {isSubmitting ? 'Saving...' : 'Add Product'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}