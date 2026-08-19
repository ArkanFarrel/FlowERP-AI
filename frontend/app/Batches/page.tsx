/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/ui/layout/sidebar";
import Topbar from "@/components/ui/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Box, Search, Plus, Filter, AlertTriangle, XCircle, 
  CheckCircle2, Clock, RefreshCw, Calculator
} from "lucide-react";
import { toast } from "sonner";
import { getProductBatches, createProductBatch, allocateStockFIFO, allocateStockFEFO, getProductsForDropdown, ProductBatch } from "@/app/actions/batches";

export default function BatchesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [warehouseFilter, setWarehouseFilter] = useState("Semua");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);

  // Add Form State
  const [formData, setFormData] = useState({
    productId: "",
    batchNumber: "",
    lotNumber: "",
    quantity: 0,
    mfgDate: "",
    expiryDate: "",
    warehouse: "",
    costPrice: 0
  });

  // Simulation Form State
  const [simData, setSimData] = useState({
    productId: "",
    quantity: 0,
    type: "FIFO" as "FIFO" | "FEFO"
  });
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchesData, productsData] = await Promise.all([
        getProductBatches(),
        getProductsForDropdown()
      ]);
      setBatches(batchesData);
      setProducts(productsData);
    } catch (err) {
      toast.error("Gagal memuat data batch");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBatch = async () => {
    if (!formData.productId || !formData.batchNumber || !formData.lotNumber || formData.quantity <= 0 || !formData.mfgDate || !formData.expiryDate) {
      toast.error("Mohon lengkapi semua field yang wajib");
      return;
    }
    
    try {
      await createProductBatch(formData);
      toast.success("Batch berhasil ditambahkan");
      setShowAddModal(false);
      fetchData();
      setFormData({ productId: "", batchNumber: "", lotNumber: "", quantity: 0, mfgDate: "", expiryDate: "", warehouse: "", costPrice: 0 });
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan batch");
    }
  };

  const handleSimulate = async () => {
    if (!simData.productId || simData.quantity <= 0) {
      toast.error("Pilih produk dan masukkan jumlah yang valid");
      return;
    }

    try {
      const result = simData.type === "FIFO" 
        ? await allocateStockFIFO(simData.productId, simData.quantity)
        : await allocateStockFEFO(simData.productId, simData.quantity);
      setSimResult(result);
    } catch (err: any) {
      toast.error("Gagal melakukan simulasi");
    }
  };

  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      const matchSearch = 
        b.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchStatus = true;
      if (statusFilter === "Valid") matchStatus = b.status === "VALID";
      if (statusFilter === "Mendekati Kadaluarsa") matchStatus = b.status === "EXPIRING_SOON";
      if (statusFilter === "Kadaluarsa") matchStatus = b.status === "EXPIRED";
      if (statusFilter === "Habis") matchStatus = b.status === "OUT_OF_STOCK";

      const matchWarehouse = warehouseFilter === "Semua" || b.warehouse === warehouseFilter;

      return matchSearch && matchStatus && matchWarehouse;
    });
  }, [batches, searchTerm, statusFilter, warehouseFilter]);

  const stats = useMemo(() => {
    return {
      total: batches.length,
      valid: batches.filter(b => b.status === "VALID").length,
      expiring: batches.filter(b => b.status === "EXPIRING_SOON").length,
      expired: batches.filter(b => b.status === "EXPIRED").length
    };
  }, [batches]);

  const warehouses = useMemo(() => {
    const whs = new Set(batches.map(b => b.warehouse).filter(Boolean));
    return ["Semua", ...Array.from(whs)];
  }, [batches]);

  if (!mounted) return null;

  return (
    <div className={`min-h-screen ${isDark ? "dark bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900"} flex`}>
      <Sidebar sidebarOpen={sidebarOpen} />
      
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Topbar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDark={isDark} 
          setIsDark={setIsDark}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                    <Box className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                  </div>
                  <h1 className="text-2xl font-bold">Pelacakan Batch, Lot & Kadaluarsa</h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  Manajemen nomor batch, tanggal expired, dan alokasi stok berbasis FIFO / FEFO
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSimModal(true)} className="gap-2">
                  <Calculator className="w-4 h-4" />
                  Simulasi Alokasi
                </Button>
                <Button onClick={() => setShowAddModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                  <Plus className="w-4 h-4" />
                  Tambah Batch Baru
                </Button>
              </div>
            </div>

            {/* Warning Banner */}
            {stats.expiring > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                  <div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-400">Peringatan Kadaluarsa!</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-500">
                      Terdapat {stats.expiring} batch yang akan kadaluarsa dalam waktu kurang dari 30 hari.
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400" onClick={() => setStatusFilter("Mendekati Kadaluarsa")}>
                  Tindak Lanjuti
                </Button>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-5 flex items-center gap-4 border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl"><Box /></div>
                <div>
                  <p className="text-sm text-slate-500">Total Batch</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </Card>
              <Card className="p-5 flex items-center gap-4 border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl"><CheckCircle2 /></div>
                <div>
                  <p className="text-sm text-slate-500">Batch Aktif</p>
                  <p className="text-2xl font-bold">{stats.valid}</p>
                </div>
              </Card>
              <Card className="p-5 flex items-center gap-4 border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl"><Clock /></div>
                <div>
                  <p className="text-sm text-slate-500">Mendekati Expired</p>
                  <p className="text-2xl font-bold">{stats.expiring}</p>
                </div>
              </Card>
              <Card className="p-5 flex items-center gap-4 border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl"><XCircle /></div>
                <div>
                  <p className="text-sm text-slate-500">Sudah Expired</p>
                  <p className="text-2xl font-bold">{stats.expired}</p>
                </div>
              </Card>
            </div>

            {/* Filters */}
            <Card className="p-4 rounded-2xl border-slate-200 dark:border-slate-800">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Cari SKU, Nama Produk, atau Batch..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-48">
                  <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "Semua")}>
                    <SelectTrigger>
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Semua">Semua Status</SelectItem>
                      <SelectItem value="Valid">Valid</SelectItem>
                      <SelectItem value="Mendekati Kadaluarsa">Mendekati Kadaluarsa</SelectItem>
                      <SelectItem value="Kadaluarsa">Kadaluarsa</SelectItem>
                      <SelectItem value="Habis">Habis (Out of Stock)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-48">
                  <Select value={warehouseFilter} onValueChange={(val) => setWarehouseFilter(val || "Semua")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Gudang" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(w => (
                        <SelectItem key={w} value={w}>{w}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Table */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4 font-medium">Batch & Lot#</th>
                      <th className="p-4 font-medium">Produk (SKU)</th>
                      <th className="p-4 font-medium">Gudang</th>
                      <th className="p-4 font-medium">Sisa / Awal</th>
                      <th className="p-4 font-medium">Tgl Produksi</th>
                      <th className="p-4 font-medium">Tgl Kadaluarsa</th>
                      <th className="p-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {loading ? (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-500"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Memuat...</td></tr>
                    ) : filteredBatches.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-500">Tidak ada batch yang ditemukan.</td></tr>
                    ) : (
                      filteredBatches.map(batch => (
                        <tr key={batch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                          <td className="p-4">
                            <div className="font-medium">{batch.batchNumber}</div>
                            <div className="text-xs text-slate-500">Lot: {batch.lotNumber}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-amber-600 dark:text-amber-500">{batch.productName}</div>
                            <div className="text-xs text-slate-500">{batch.sku}</div>
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{batch.warehouse}</td>
                          <td className="p-4">
                            <span className="font-semibold">{batch.remainingQty}</span> / <span className="text-slate-500">{batch.initialQty}</span>
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">
                            {new Date(batch.mfgDate).toLocaleDateString('id-ID')}
                          </td>
                          <td className="p-4">
                            <div>{new Date(batch.expiryDate).toLocaleDateString('id-ID')}</div>
                            <div className={`text-xs ${batch.daysUntilExpiry < 0 ? 'text-red-500' : batch.daysUntilExpiry <= 30 ? 'text-amber-500' : 'text-slate-500'}`}>
                              {batch.daysUntilExpiry < 0 ? `${Math.abs(batch.daysUntilExpiry)} hari lewat` : `${batch.daysUntilExpiry} hari lagi`}
                            </div>
                          </td>
                          <td className="p-4">
                            {batch.status === 'VALID' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Valid</Badge>}
                            {batch.status === 'EXPIRING_SOON' && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Mendekati Expired</Badge>}
                            {batch.status === 'EXPIRED' && <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">Expired</Badge>}
                            {batch.status === 'OUT_OF_STOCK' && <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-0">Habis</Badge>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </main>
      </div>

      {/* Modal Tambah Batch Baru */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-125 rounded-3xl">
          <DialogHeader>
            <DialogTitle>Tambah Batch Baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Produk</Label>
              <Select 
                value={formData.productId} 
                onValueChange={(val) => {
                  const v = val || "";
                  const prod = products.find(p => p.id === v);
                  setFormData({...formData, productId: v, costPrice: 0, warehouse: prod?.warehouse || "Central Store"});
                }}
              >
                <SelectTrigger><SelectValue placeholder="Pilih Produk..." /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nomor Batch</Label>
                <Input value={formData.batchNumber} onChange={e => setFormData({...formData, batchNumber: e.target.value})} placeholder="Contoh: BN-001" />
              </div>
              <div className="space-y-2">
                <Label>Nomor Lot</Label>
                <Input value={formData.lotNumber} onChange={e => setFormData({...formData, lotNumber: e.target.value})} placeholder="Contoh: LOT-A" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jumlah Stok</Label>
                <Input type="number" min="1" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Gudang</Label>
                <Input value={formData.warehouse} onChange={e => setFormData({...formData, warehouse: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tgl Produksi</Label>
                <Input type="date" value={formData.mfgDate} onChange={e => setFormData({...formData, mfgDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Tgl Kadaluarsa</Label>
                <Input type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Batal</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleAddBatch}>Simpan Batch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Simulasi */}
      <Dialog open={showSimModal} onOpenChange={setShowSimModal}>
        <DialogContent className="sm:max-w-150 rounded-3xl">
          <DialogHeader>
            <DialogTitle>Simulasi Alokasi (FIFO / FEFO)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Produk</Label>
                <Select value={simData.productId} onValueChange={(val) => setSimData({...simData, productId: val || "", quantity: 0})}>
                  <SelectTrigger><SelectValue placeholder="Pilih Produk..." /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jumlah Order</Label>
                <Input type="number" min="1" value={simData.quantity || ''} onChange={e => setSimData({...simData, quantity: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="flex gap-4 mb-2">
              <Button 
                variant={simData.type === 'FIFO' ? 'default' : 'outline'} 
                className={simData.type === 'FIFO' ? 'bg-amber-600 hover:bg-amber-700 text-white flex-1' : 'flex-1'}
                onClick={() => { setSimData({...simData, type: 'FIFO'}); setSimResult(null); }}
              >
                Gunakan FIFO (First In First Out)
              </Button>
              <Button 
                variant={simData.type === 'FEFO' ? 'default' : 'outline'} 
                className={simData.type === 'FEFO' ? 'bg-amber-600 hover:bg-amber-700 text-white flex-1' : 'flex-1'}
                onClick={() => { setSimData({...simData, type: 'FEFO'}); setSimResult(null); }}
              >
                Gunakan FEFO (First Expired First Out)
              </Button>
            </div>
            <Button className="w-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" onClick={handleSimulate}>Jalankan Simulasi</Button>

            {simResult && (
              <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <h4 className="font-semibold mb-2 flex items-center justify-between">
                  Hasil Simulasi
                  <Badge className={simResult.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                    {simResult.success ? "Stok Terpenuhi" : "Stok Kurang"}
                  </Badge>
                </h4>
                <div className="text-sm space-y-1 mb-4">
                  <p>Diminta: <strong>{simResult.requested}</strong> | Teralokasi: <strong>{simResult.allocated}</strong></p>
                  {simResult.shortage > 0 && <p className="text-red-500">Kekurangan: {simResult.shortage}</p>}
                </div>
                {simResult.allocations.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500">Urutan Pengambilan Batch:</p>
                    {simResult.allocations.map((a: any, i: number) => (
                      <div key={i} className="text-sm p-2 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg flex justify-between items-center">
                        <div>
                          <span className="font-semibold">{a.batchNumber}</span> (Lot: {a.lotNumber})
                          <div className="text-xs text-slate-500">Exp: {new Date(a.expiryDate).toLocaleDateString('id-ID')}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-amber-600 dark:text-amber-500">Ambil {a.allocatedQty}</div>
                          <div className="text-xs text-slate-500">Sisa batch: {a.remainingInBatchAfter}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Tidak ada stok yang tersedia.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSimModal(false); setSimResult(null); }}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
