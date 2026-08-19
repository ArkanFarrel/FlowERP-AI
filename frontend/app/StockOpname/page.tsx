'use client';

import Sidebar from '@/components/ui/layout/sidebar';
import Topbar from '@/components/ui/layout/topbar';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Search, CheckCircle2, AlertTriangle, RefreshCw, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllProductsForOpname, createStockOpname, type OpnameProduct } from '@/app/actions/opname';
import { transferStockBetweenWarehouses } from '@/app/actions/inventory';
import { toast } from 'sonner';

export default function StockOpnamePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [products, setProducts] = useState<OpnameProduct[]>([]);
  const [search, setSearch] = useState("");
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Dialog state
  const [showSuccess, setShowSuccess] = useState(false);
  const [opnameResult, setOpnameResult] = useState<{ opnameId?: string; totalAdjusted?: number } | null>(null);

  // Transfer state
  const [transferProduct, setTransferProduct] = useState("");
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [transferQty, setTransferQty] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [inTransit, setInTransit] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
    const storedTransfers = localStorage.getItem('flowerp_transfers_intransit');
    if (storedTransfers) {
      try {
        setInTransit(JSON.parse(storedTransfers));
      } catch (e) {}
    }
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await getAllProductsForOpname();
    if (res.success) {
      setProducts(res.data);
      const initialCounts: Record<string, number> = {};
      res.data.forEach(p => initialCounts[p.id] = p.stock);
      setPhysicalCounts(initialCounts);
    }
    setLoading(false);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const handleCountChange = (id: string, value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 0) {
      setPhysicalCounts(prev => ({ ...prev, [id]: num }));
    } else if (value === "") {
      setPhysicalCounts(prev => ({ ...prev, [id]: 0 }));
    }
  };

  const handleNoteChange = (id: string, value: string) => {
    setNotes(prev => ({ ...prev, [id]: value }));
  };

  const itemsWithDiscrepancy = useMemo(() => {
    return products.filter(p => physicalCounts[p.id] !== undefined && physicalCounts[p.id] !== p.stock);
  }, [products, physicalCounts]);

  const totalDiscrepancyUnit = useMemo(() => {
    return itemsWithDiscrepancy.reduce((acc, p) => acc + Math.abs(physicalCounts[p.id] - p.stock), 0);
  }, [itemsWithDiscrepancy, physicalCounts]);

  const handleCommit = async () => {
    if (itemsWithDiscrepancy.length === 0) return;
    setSubmitting(true);
    const items = itemsWithDiscrepancy.map(p => ({
      productId: p.id,
      systemStock: p.stock,
      physicalCount: physicalCounts[p.id],
      notes: notes[p.id] || ""
    }));

    const res = await createStockOpname(items);
    setSubmitting(false);
    if (res.success) {
      setOpnameResult(res);
      setShowSuccess(true);
      fetchProducts();
      setNotes({});
    } else {
      toast.error(res.error || "Gagal melakukan stock opname");
    }
  };

  const handleTransfer = async () => {
    if (!transferProduct || !fromWarehouse || !toWarehouse || !transferQty) {
      toast.error("Lengkapi semua form transfer");
      return;
    }
    const res = await transferStockBetweenWarehouses({
      productId: transferProduct,
      sourceWarehouse: fromWarehouse,
      targetWarehouse: toWarehouse,
      quantity: Number(transferQty),
      notes: transferNotes
    });
    if (res.success) {
      toast.success("Transfer berhasil dimulai");
      const newTransfer = {
        id: Date.now().toString(),
        waybill: res.waybillNumber,
        productId: transferProduct,
        productName: products.find(p => p.id === transferProduct)?.name || "Produk",
        qty: Number(transferQty),
        from: fromWarehouse,
        to: toWarehouse,
        status: "In Transit",
        date: new Date().toISOString()
      };
      const updated = [newTransfer, ...inTransit];
      setInTransit(updated);
      localStorage.setItem('flowerp_transfers_intransit', JSON.stringify(updated));
      
      setTransferProduct("");
      setFromWarehouse("");
      setToWarehouse("");
      setTransferQty("");
      setTransferNotes("");
    } else {
      toast.error(res.error || "Transfer gagal");
    }
  };

  const handleTerimaTransfer = (id: string) => {
    const updated = inTransit.map(t => t.id === id ? { ...t, status: 'Diterima' } : t);
    setInTransit(updated);
    localStorage.setItem('flowerp_transfers_intransit', JSON.stringify(updated));
    toast.success("Transfer diterima");
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 w-full overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDark={isDark}
          setIsDark={setIsDark}
          onRefresh={fetchProducts}
          isLoading={loading}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl dark:bg-emerald-900/30 dark:text-emerald-400">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stock Opname</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Produk</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{products.length}</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Ada Selisih</p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{itemsWithDiscrepancy.length} item</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Selisih Unit</p>
              <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">{totalDiscrepancyUnit}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-6">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="relative max-w-md">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Cari produk / SKU..."
                  className="pl-10"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium">
                  <tr>
                    <th className="px-4 py-3">Nama Produk</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Gudang</th>
                    <th className="px-4 py-3 text-right">Stok Sistem</th>
                    <th className="px-4 py-3 text-right w-32">Stok Fisik</th>
                    <th className="px-4 py-3 text-right">Selisih</th>
                    <th className="px-4 py-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-500">Memuat data produk...</td></tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-500">Tidak ada produk ditemukan.</td></tr>
                  ) : (
                    filteredProducts.map(p => {
                      const count = physicalCounts[p.id] ?? p.stock;
                      const diff = count - p.stock;
                      const hasDiff = diff !== 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{p.name}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.sku}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.warehouse}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">{p.stock}</td>
                          <td className="px-4 py-3">
                            <Input 
                              type="number"
                              min="0"
                              value={count}
                              onChange={e => handleCountChange(p.id, e.target.value)}
                              className={`text-right ${hasDiff ? 'border-amber-300 focus-visible:ring-amber-500 dark:border-amber-700' : ''}`}
                            />
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                          <td className="px-4 py-3">
                            <Input 
                              placeholder="Alasan selisih..."
                              value={notes[p.id] || ""}
                              onChange={e => handleNoteChange(p.id, e.target.value)}
                              className="w-full"
                            />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <Button 
                onClick={handleCommit} 
                disabled={itemsWithDiscrepancy.length === 0 || submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Commit Opname
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transfer Antar Gudang</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Pilih Produk</Label>
                  <Select value={transferProduct} onValueChange={(val) => setTransferProduct(val || "")}>
                    <SelectTrigger><SelectValue placeholder="Pilih Produk..." /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock} pcs)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gudang Asal</Label>
                    <Input placeholder="Misal: Central Store" value={fromWarehouse} onChange={e => setFromWarehouse(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gudang Tujuan</Label>
                    <Input placeholder="Misal: Gudang Depan" value={toWarehouse} onChange={e => setToWarehouse(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Jumlah Transfer</Label>
                  <Input type="number" min="1" placeholder="0" value={transferQty} onChange={e => setTransferQty(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Catatan</Label>
                  <Input placeholder="Opsional..." value={transferNotes} onChange={e => setTransferNotes(e.target.value)} />
                </div>
                <Button onClick={handleTransfer} className="w-full bg-sky-600 hover:bg-sky-700 text-white">Buat Surat Jalan Transfer</Button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Tracking In-Transit</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {inTransit.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">Belum ada proses transfer stok aktif.</div>
                ) : (
                  inTransit.map(t => (
                    <div key={t.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{t.productName}</p>
                          <p className="text-xs text-slate-500">{t.waybill} • {new Date(t.date).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.status === 'Diterima' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                          {t.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                        <span>{t.from}</span>
                        <span>&rarr;</span>
                        <span>{t.to}</span>
                        <span className="font-medium ml-auto">{t.qty} pcs</span>
                      </div>
                      {t.status !== 'Diterima' && (
                        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => handleTerimaTransfer(t.id)}>
                          Konfirmasi Terima
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
            <DialogContent className="sm:max-w-md">
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Opname Selesai!</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  {opnameResult?.totalAdjusted} produk telah disesuaikan.<br/>
                  <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded mt-2 inline-block">Ref: {opnameResult?.opnameId}</span>
                </p>
                <Button onClick={() => setShowSuccess(false)} className="w-full">Tutup</Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
