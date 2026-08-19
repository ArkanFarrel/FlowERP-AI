/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Sidebar from '@/components/ui/layout/sidebar';
import Topbar from '@/components/ui/layout/topbar';
import { useState, useEffect, useMemo } from 'react';
// import { useRouter } from 'next/navigation';
import { 
  getProductBundles, 
  createProductBundle, 
  deleteProductBundle, 
  processBundleSale, 
  assembleBundleStock,
  ProductBundle,
} from '@/app/actions/bundles';
import { getProducts } from '@/app/actions/products';
import { formatPrice } from '@/lib/currency';
import { 
  PackagePlus, 
  Plus, 
  Trash2, 
  Search,
  ShoppingCart,
  Wrench,
  Boxes,
  Percent,
  Layers,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export default function BundlesPage() {
  const [bundles, setBundles] = useState<ProductBundle[]>([]);
  const [products, setProducts] = useState<Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    warehouse: string;
    stock: number;
    minStock: number;
    costPrice: number;
    sellingPrice: number;
    price: string;
    status: string;
    image: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Form State
  const [newBundle, setNewBundle] = useState({
    name: '',
    sku: '',
    category: 'Bundles',
    description: '',
    bundlePrice: 0,
  });
  const [bundleComponents, setBundleComponents] = useState<{ productId: string, quantityRequired: number }[]>([]);
  
  // Simulate Form State
  const [selectedBundleId, setSelectedBundleId] = useState<string>('');
  const [simulateAction, setSimulateAction] = useState<'sell' | 'assemble'>('sell');
  const [simulateQuantity, setSimulateQuantity] = useState<number>(1);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [bundlesRes, productsRes] = await Promise.all([
        getProductBundles(),
        getProducts()
      ]);
      
      if (bundlesRes.success && bundlesRes.data) {
        setBundles(bundlesRes.data);
      }
      
      if (productsRes.success && productsRes.data) {
        setProducts(productsRes.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  // Derived Stats
  const totalBundles = bundles.length;
  const activeComponentsCount = useMemo(() => {
    const ids = new Set();
    bundles.forEach(b => b.components.forEach(c => ids.add(c.productId)));
    return ids.size;
  }, [bundles]);
  
  const totalReadyToSell = bundles.reduce((acc, b) => acc + (b.maxBuildableUnits || 0), 0);
  const avgMargin = bundles.length > 0 
    ? (bundles.reduce((acc, b) => acc + b.profitMarginPercent, 0) / bundles.length).toFixed(1)
    : 0;

  const filteredBundles = bundles.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add Component Row
  const addComponentRow = () => {
    setBundleComponents([...bundleComponents, { productId: '', quantityRequired: 1 }]);
  };
  
  const updateComponentRow = (index: number, field: string, value: any) => {
    const updated = [...bundleComponents];
    updated[index] = { ...updated[index], [field]: value };
    setBundleComponents(updated);
  };
  
  const removeComponentRow = (index: number) => {
    setBundleComponents(bundleComponents.filter((_, i) => i !== index));
  };

  const currentAddTotalCost = useMemo(() => {
    return bundleComponents.reduce((total, comp) => {
      const product = products.find(p => p.id === comp.productId);
      if (product) {
        return total + (Number(product.costPrice) * comp.quantityRequired);
      }
      return total;
    }, 0);
  }, [bundleComponents, products]);

  const projectedAddMargin = useMemo(() => {
    if (newBundle.bundlePrice > 0 && currentAddTotalCost > 0) {
      return ((newBundle.bundlePrice - currentAddTotalCost) / newBundle.bundlePrice) * 100;
    }
    return 0;
  }, [newBundle.bundlePrice, currentAddTotalCost]);

  const handleCreateBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBundle.name || !newBundle.sku || newBundle.bundlePrice <= 0 || bundleComponents.length === 0) {
      toast.error('Harap lengkapi semua field dan minimal 1 komponen.');
      return;
    }

    if (bundleComponents.some(c => !c.productId || c.quantityRequired <= 0)) {
      toast.error('Komponen tidak valid. Pilih produk dan set quantity > 0.');
      return;
    }

    try {
      const res = await createProductBundle({
        ...newBundle,
        components: bundleComponents
      });

      if (res.success) {
        toast.success('Paket berhasil dibuat!');
        setIsAddModalOpen(false);
        setNewBundle({ name: '', sku: '', category: 'Bundles', description: '', bundlePrice: 0 });
        setBundleComponents([]);
        fetchInitialData();
      } else {
        toast.error(res.error || 'Gagal membuat paket');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus paket ini?')) return;
    try {
      const res = await deleteProductBundle(id);
      if (res.success) {
        toast.success('Paket dihapus');
        fetchInitialData();
      } else {
        toast.error(res.error || 'Gagal menghapus');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBundleId || simulateQuantity <= 0) return;
    
    try {
      let res;
      if (simulateAction === 'sell') {
        res = await processBundleSale(selectedBundleId, simulateQuantity, 'POS-SIM-001');
      } else {
        res = await assembleBundleStock(selectedBundleId, simulateQuantity);
      }

      if (res.success) {
        toast.success(`Berhasil ${simulateAction === 'sell' ? 'menjual' : 'merakit'} ${simulateQuantity} paket`);
        setIsSimulateModalOpen(false);
        setSimulateQuantity(1);
        fetchInitialData();
      } else {
        toast.error(res.error || 'Gagal simulasi');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const selectedBundleForSimulation = bundles.find(b => b.id === selectedBundleId);

  return (
    <div className={`flex h-screen w-full transition-colors duration-200 ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar sidebarOpen={sidebarOpen} onLogout={() => {}} />

      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDark={isDark}
          setIsDark={setIsDark}
          onRefresh={fetchInitialData}
          isLoading={isLoading}
        />

        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Header */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 mb-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                    <PackagePlus className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                      Product Bundling & Assembly
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Definisi paket produk, Bill of Materials sederhana, dan pemotongan stok multi-komponen otomatis
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsSimulateModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    Simulasi / Uji
                  </button>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Buat Paket Baru
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
              {[
                { label: 'Total Paket Bundle', value: totalBundles, icon: Boxes, color: 'sky' },
                { label: 'Total Komponen Aktif', value: activeComponentsCount, icon: Layers, color: 'indigo' },
                { label: 'Paket Siap Jual', value: totalReadyToSell, icon: ShoppingCart, color: 'emerald' },
                { label: 'Rata-rata Margin', value: `${avgMargin}%`, icon: Percent, color: 'amber' },
              ].map((stat, idx) => (
                <div key={idx} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                      <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{stat.value}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-${stat.color}-100 text-${stat.color}-600 dark:bg-${stat.color}-900/30 dark:text-${stat.color}-400`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* List */}
            <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
              <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari paket atau SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-4 font-medium">Info Paket</th>
                      <th className="px-5 py-4 font-medium">Komponen Pembentuk</th>
                      <th className="px-5 py-4 font-medium">Harga Jual & Modal</th>
                      <th className="px-5 py-4 font-medium">Ketersediaan</th>
                      <th className="px-5 py-4 font-medium text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                    {filteredBundles.map(bundle => (
                      <tr key={bundle.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900 dark:text-white">{bundle.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">SKU: {bundle.sku}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1 max-w-75">
                            {bundle.components.map((comp, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {comp.quantityRequired}x {comp.productName}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900 dark:text-white">{formatPrice(bundle.bundlePrice)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">Modal: {formatPrice(bundle.totalComponentCost)}</span>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${bundle.profitMarginPercent > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {bundle.profitMarginPercent > 0 ? '+' : ''}{bundle.profitMarginPercent.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bundle.maxBuildableUnits > 0 ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {bundle.maxBuildableUnits > 0 ? (
                              <><CheckCircle size={14}/> Siap Dirakit: {bundle.maxBuildableUnits}</>
                            ) : (
                              <><AlertCircle size={14}/> Stok Komponen Habis</>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button 
                            onClick={() => handleDelete(bundle.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredBundles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                          Belum ada paket / bundle.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Buat Paket Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-white">Buat Paket / Bundle Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="add-bundle-form" onSubmit={handleCreateBundle} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-300">Nama Paket</label>
                    <input type="text" required value={newBundle.name} onChange={e => setNewBundle({...newBundle, name: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="Contoh: Paket Sembako Hemat" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-300">SKU Bundle</label>
                    <input type="text" required value={newBundle.sku} onChange={e => setNewBundle({...newBundle, sku: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="BNDL-001" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 dark:text-slate-300">Harga Jual Paket (Total)</label>
                  <input type="number" required min="1" value={newBundle.bundlePrice || ''} onChange={e => setNewBundle({...newBundle, bundlePrice: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="0" />
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium dark:text-slate-300">Komponen Produk (BOM)</label>
                    <button type="button" onClick={addComponentRow} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">+ Tambah Baris</button>
                  </div>

                  <div className="space-y-3">
                    {bundleComponents.map((comp, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <select 
                          required
                          value={comp.productId}
                          onChange={(e) => updateComponentRow(idx, 'productId', e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                        >
                          <option value="">Pilih Produk Asal...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock}) - {formatPrice(p.costPrice)}/pcs</option>
                          ))}
                        </select>
                        <input 
                          type="number" 
                          min="1" 
                          required
                          value={comp.quantityRequired || ''}
                          onChange={(e) => updateComponentRow(idx, 'quantityRequired', Number(e.target.value))}
                          placeholder="Qty"
                          className="w-20 px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white" 
                        />
                        <button type="button" onClick={() => removeComponentRow(idx)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {bundleComponents.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">Belum ada komponen ditambahkan.</p>
                    )}
                  </div>
                </div>

                {bundleComponents.length > 0 && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/50 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Estimasi Modal Komponen: <span className="font-bold">{formatPrice(currentAddTotalCost)}</span></p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">Margin Keuntungan: <span className="font-bold">{projectedAddMargin > 0 ? '+' : ''}{projectedAddMargin.toFixed(1)}%</span></p>
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
              <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl dark:text-slate-300 dark:hover:bg-slate-800">Batal</button>
              <button form="add-bundle-form" type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm">Simpan Paket</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Simulasi / Uji */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-white">Simulasi Perakitan & Penjualan</h3>
              <button onClick={() => setIsSimulateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <form id="simulate-form" onSubmit={handleSimulate} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5 dark:text-slate-300">Pilih Paket</label>
                  <select 
                    required
                    value={selectedBundleId}
                    onChange={(e) => setSelectedBundleId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  >
                    <option value="">Pilih paket bundle...</option>
                    {bundles.map(b => (
                      <option key={b.id} value={b.id}>{b.name} (Max Rakit: {b.maxBuildableUnits})</option>
                    ))}
                  </select>
                </div>

                {selectedBundleForSimulation && (
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Kebutuhan Komponen / Pcs:</p>
                    <ul className="text-sm space-y-1">
                      {selectedBundleForSimulation.components.map((c, i) => (
                        <li key={i} className="flex justify-between dark:text-slate-300">
                          <span>{c.quantityRequired}x {c.productName}</span>
                          <span className="text-slate-400">Stok: {c.currentStock}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-300">Tipe Aksi</label>
                    <select 
                      value={simulateAction}
                      onChange={(e) => setSimulateAction(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    >
                      <option value="sell">Langsung Jual (POS)</option>
                      <option value="assemble">Rakit & Simpan Stok (Gudang)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-300">Jumlah Paket</label>
                    <input 
                      type="number" 
                      min="1" 
                      max={selectedBundleForSimulation?.maxBuildableUnits || 1}
                      required
                      value={simulateQuantity}
                      onChange={(e) => setSimulateQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white" 
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Aksi ini akan langsung memotong stok komponen asli di database untuk mensimulasikan proses riil.
                </p>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
              <button onClick={() => setIsSimulateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl dark:text-slate-300 dark:hover:bg-slate-800">Batal</button>
              <button form="simulate-form" type="submit" disabled={!selectedBundleId} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl shadow-sm disabled:opacity-50">Jalankan Proses</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircle({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}

function AlertCircle({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  );
}
