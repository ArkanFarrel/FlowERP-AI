/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/layout/sidebar';
import Topbar from '@/components/ui/layout/topbar';
import { formatPrice } from '@/lib/currency';
import { BookOpen, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

import {
  getChartOfAccounts,
  getJournalEntries,
  getProfitAndLossReport,
  getBalanceSheetReport,
  getCashFlowStatement,
  getARAPAgingSummary,
  createAccount,
  createManualJournalEntry
} from '@/app/actions/accounting';

export default function AccountingPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState('coa');
  const [loading, setLoading] = useState(true);

  // Data states
  const [coa, setCoa] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [pnl, setPnl] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [aging, setAging] = useState<any>(null);

  // Modals
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddJournalOpen, setIsAddJournalOpen] = useState(false);

  // Forms
  const [newAccount, setNewAccount] = useState({ code: '', name: '', type: 'ASSET' });
  const [newJournal, setNewJournal] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    items: [{ accountCode: '', debit: 0, credit: 0 }, { accountCode: '', debit: 0, credit: 0 }]
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [coaData, journalData, pnlData, bsData, cfData, agingData] = await Promise.all([
        getChartOfAccounts(),
        getJournalEntries(),
        getProfitAndLossReport(),
        getBalanceSheetReport(),
        getCashFlowStatement(),
        getARAPAgingSummary()
      ]);
      setCoa(coaData);
      setJournals(journalData);
      setPnl(pnlData);
      setBalanceSheet(bsData);
      setCashFlow(cfData);
      setAging(agingData);
    } catch (error) {
      console.error(error);
      toast.error('Gagal memuat data akuntansi');
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAccount(newAccount);
      toast.success('Akun berhasil ditambahkan');
      setIsAddAccountOpen(false);
      setNewAccount({ code: '', name: '', type: 'ASSET' });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan akun');
    }
  };

  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Find account names
      const items = newJournal.items.map(item => {
        const account = coa.find(a => a.code === item.accountCode);
        return {
          ...item,
          accountName: account ? account.name : 'Unknown Account',
          debit: Number(item.debit),
          credit: Number(item.credit)
        };
      });

      await createManualJournalEntry({ ...newJournal, items });
      toast.success('Jurnal berhasil dicatat');
      setIsAddJournalOpen(false);
      setNewJournal({
        date: new Date().toISOString().split('T')[0],
        description: '',
        items: [{ accountCode: '', debit: 0, credit: 0 }, { accountCode: '', debit: 0, credit: 0 }]
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal mencatat jurnal');
    }
  };

  const tabs = [
    { id: 'coa', name: 'Bagan Akun (COA)'},
    { id: 'journal', name: 'Jurnal Umum'},
    { id: 'pnl', name: 'Laba Rugi'},
    { id: 'balancesheet', name: 'Neraca Keuangan'},
    { id: 'cashflow', name: 'Arus Kas'},
    { id: 'aging', name: 'Umur Piutang/Hutang'},
  ];

  const groupCoa = (data: any[]) => {
    const grouped = {
      ASSET: [] as any[],
      LIABILITY: [] as any[],
      EQUITY: [] as any[],
      REVENUE: [] as any[],
      EXPENSE: [] as any[],
    };
    data.forEach(item => {
      if (grouped[item.type as keyof typeof grouped]) {
        grouped[item.type as keyof typeof grouped].push(item);
      }
    });
    return grouped;
  };

  const groupedCoa = groupCoa(coa);

  return (
    <div className={`flex h-screen w-full overflow-hidden transition-colors duration-200 ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar sidebarOpen={sidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDark={isDark}
          setIsDark={setIsDark}
          onRefresh={loadData}
          isLoading={loading}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                <BookOpen className="text-sky-600 w-8 h-8" />
                Akuntansi & Buku Besar
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Sistem akuntansi standar industri dengan jurnal otomatis, neraca, dan laba rugi real-time
              </p>
            </div>
            
            <div className="flex gap-3">
              {activeTab === 'coa' && (
                <>
                  <Button onClick={() => setIsAddAccountOpen(true)} className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" /> Tambah Akun
                  </Button>
                  <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
                    <DialogContent className="dark:bg-slate-900">
                      <DialogHeader>
                        <DialogTitle>Tambah Akun Baru (COA)</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddAccount} className="space-y-4">
                        <div>
                          <Label>Kode Akun</Label>
                          <Input required value={newAccount.code} onChange={e => setNewAccount({...newAccount, code: e.target.value})} placeholder="e.g. 1400" />
                        </div>
                        <div>
                          <Label>Nama Akun</Label>
                          <Input required value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} placeholder="e.g. Aset Tetap" />
                        </div>
                        <div>
                          <Label>Tipe Akun</Label>
                          <select className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" 
                            value={newAccount.type} onChange={e => setNewAccount({...newAccount, type: e.target.value})}>
                            <option value="ASSET">Aset (ASSET)</option>
                            <option value="LIABILITY">Kewajiban (LIABILITY)</option>
                            <option value="EQUITY">Ekuitas (EQUITY)</option>
                            <option value="REVENUE">Pendapatan (REVENUE)</option>
                            <option value="EXPENSE">Beban (EXPENSE)</option>
                          </select>
                        </div>
                        <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 cursor-pointer">Simpan Akun</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              {activeTab === 'journal' && (
                <>
                  <Button onClick={() => setIsAddJournalOpen(true)} className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" /> Jurnal Manual
                  </Button>
                  <Dialog open={isAddJournalOpen} onOpenChange={setIsAddJournalOpen}>
                    <DialogContent className="max-w-2xl dark:bg-slate-900">
                      <DialogHeader>
                        <DialogTitle>Buat Entri Jurnal Manual</DialogTitle>
                      </DialogHeader>
                    <form onSubmit={handleAddJournal} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Tanggal</Label>
                          <Input required type="date" value={newJournal.date} onChange={e => setNewJournal({...newJournal, date: e.target.value})} />
                        </div>
                        <div>
                          <Label>Deskripsi / Keterangan</Label>
                          <Input required value={newJournal.description} onChange={e => setNewJournal({...newJournal, description: e.target.value})} placeholder="Keterangan jurnal" />
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        <Label>Item Jurnal (Debit / Kredit)</Label>
                        {newJournal.items.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <select required className="flex-1 h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200" 
                              value={item.accountCode} 
                              onChange={e => {
                                const newItems = [...newJournal.items];
                                newItems[idx].accountCode = e.target.value;
                                setNewJournal({...newJournal, items: newItems});
                              }}>
                              <option value="">-- Pilih Akun --</option>
                              {coa.map(a => (
                                <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                              ))}
                            </select>
                            <Input type="number" placeholder="Debit" value={item.debit || ''} onChange={e => {
                              const newItems = [...newJournal.items];
                              newItems[idx].debit = parseFloat(e.target.value) || 0;
                              setNewJournal({...newJournal, items: newItems});
                            }} className="w-32" />
                            <Input type="number" placeholder="Kredit" value={item.credit || ''} onChange={e => {
                              const newItems = [...newJournal.items];
                              newItems[idx].credit = parseFloat(e.target.value) || 0;
                              setNewJournal({...newJournal, items: newItems});
                            }} className="w-32" />
                          </div>
                        ))}
                        <Button type="button" variant="outline" className="text-sm mt-2" onClick={() => setNewJournal({...newJournal, items: [...newJournal.items, {accountCode: '', debit: 0, credit: 0}]})}>
                          + Tambah Baris
                        </Button>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <span className="font-semibold dark:text-slate-200">Total</span>
                        <div className="flex gap-4">
                          <span className="w-32 text-center text-green-600 font-bold">{formatPrice(newJournal.items.reduce((a,b)=>a+b.debit,0))}</span>
                          <span className="w-32 text-center text-red-600 font-bold">{formatPrice(newJournal.items.reduce((a,b)=>a+b.credit,0))}</span>
                        </div>
                      </div>

                      <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700">Simpan Jurnal</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-b-2 border-sky-600 text-sky-600'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* TAB 1: COA */}
              {activeTab === 'coa' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(groupedCoa).map(([type, accounts]) => (
                    <Card key={type} className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                      <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 pb-4">
                        <CardTitle className="text-lg flex justify-between items-center">
                          {type}
                          <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900">{accounts.length} Akun</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {accounts.map(acc => (
                            <div key={acc.code} className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors">
                              <div className="flex gap-3 items-center">
                                <span className="text-sky-600 font-mono font-medium bg-sky-50 dark:bg-sky-900/30 px-2 py-1 rounded-md text-sm">{acc.code}</span>
                                <span className="font-medium text-slate-700 dark:text-slate-200">{acc.name}</span>
                              </div>
                              <span className={`font-semibold ${acc.balance >= 0 ? 'text-slate-800 dark:text-slate-200' : 'text-red-500'}`}>
                                {formatPrice(Math.abs(acc.balance))} {acc.balance < 0 ? '(Cr)' : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* TAB 2: JURNAL UMUM */}
              {activeTab === 'journal' && (
                <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 dark:text-slate-400">
                        <tr>
                          <th className="px-6 py-4 font-medium">Tanggal & Ref</th>
                          <th className="px-6 py-4 font-medium">Akun</th>
                          <th className="px-6 py-4 font-medium text-right">Debit</th>
                          <th className="px-6 py-4 font-medium text-right">Kredit</th>
                          <th className="px-6 py-4 font-medium text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {journals.map((entry) => {
                          const isBalanced = Math.abs(entry.items.reduce((a:any, b:any) => a + b.debit, 0) - entry.items.reduce((a:any, b:any) => a + b.credit, 0)) < 0.1;
                          
                          return (
                            <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                              <td className="px-6 py-4 align-top">
                                <div className="font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                  {new Date(entry.date).toLocaleDateString('id-ID')}
                                </div>
                                <div className="text-slate-500 mt-1">{entry.description}</div>
                                {entry.isManual && <Badge variant="outline" className="mt-2 text-xs">Manual</Badge>}
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-2">
                                  {entry.items.map((item:any, idx:number) => (
                                    <div key={idx} className={item.credit > 0 ? "ml-4 text-slate-600 dark:text-slate-400" : "text-slate-800 dark:text-slate-200 font-medium"}>
                                      {item.accountCode} - {item.accountName}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right align-top">
                                <div className="space-y-2">
                                  {entry.items.map((item:any, idx:number) => (
                                    <div key={idx} className="text-slate-800 dark:text-slate-200">
                                      {item.debit > 0 ? formatPrice(item.debit) : '-'}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right align-top">
                                <div className="space-y-2">
                                  {entry.items.map((item:any, idx:number) => (
                                    <div key={idx} className="text-slate-800 dark:text-slate-200">
                                      {item.credit > 0 ? formatPrice(item.credit) : '-'}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center align-top">
                                {isBalanced ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">Seimbang</Badge>
                                ) : (
                                  <Badge variant="destructive">Tidak Seimbang</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {journals.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                              Belum ada entri jurnal
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* TAB 3: LABA RUGI */}
              {activeTab === 'pnl' && pnl && (
                <div className="max-w-4xl mx-auto">
                  <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                    <CardHeader className="text-center border-b border-slate-100 dark:border-slate-700/50 pb-6">
                      <CardTitle className="text-2xl">Laporan Laba Rugi</CardTitle>
                      <p className="text-slate-500 mt-2">Periode Berjalan</p>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                      <div className="flex justify-between items-center py-2">
                        <span className="font-semibold text-lg text-slate-700 dark:text-slate-300">Pendapatan (Revenue)</span>
                        <span className="font-bold text-lg text-green-600">{formatPrice(pnl.revenue)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 text-slate-600 dark:text-slate-400">
                        <span>Beban Pokok Penjualan (COGS)</span>
                        <span>({formatPrice(pnl.cogs)})</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-4 border-t border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-lg text-slate-800 dark:text-white">Laba Kotor (Gross Profit)</span>
                        <span className="font-bold text-lg text-slate-800 dark:text-white">{formatPrice(pnl.grossProfit)}</span>
                      </div>

                      <div className="pt-4">
                        <span className="font-semibold text-lg text-slate-700 dark:text-slate-300 mb-4 block">Beban Operasional</span>
                        <div className="space-y-3 pl-4 border-l-2 border-slate-100 dark:border-slate-700">
                          {pnl.operatingExpenses.map((exp:any, idx:number) => (
                            <div key={idx} className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                              <span>{exp.name}</span>
                              <span>{formatPrice(exp.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 text-slate-600 dark:text-slate-400">
                        <span>Total Beban Operasional</span>
                        <span>({formatPrice(pnl.totalOperatingExpenses)})</span>
                      </div>

                      <div className="flex justify-between items-center py-6 border-t-2 border-slate-800 dark:border-slate-200 mt-6 bg-slate-50 dark:bg-slate-900/50 px-4 rounded-xl">
                        <span className="font-bold text-xl text-slate-900 dark:text-white">Laba Bersih (Net Income)</span>
                        <span className={`font-bold text-2xl ${pnl.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatPrice(pnl.netIncome)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAB 4: NERACA */}
              {activeTab === 'balancesheet' && balanceSheet && (
                <div className="max-w-5xl mx-auto space-y-6">
                  {!balanceSheet.isBalanced && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50">
                      <AlertCircle className="w-5 h-5" />
                      <div>
                        <p className="font-bold">Peringatan: Neraca Tidak Seimbang!</p>
                        <p className="text-sm">Total Aset tidak sama dengan Total Kewajiban + Ekuitas. Silakan periksa entri jurnal manual Anda.</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ASET */}
                    <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800 h-fit">
                      <CardHeader className="bg-sky-50 dark:bg-sky-900/20 rounded-t-2xl border-b border-sky-100 dark:border-sky-900/50">
                        <CardTitle className="text-sky-800 dark:text-sky-300">ASET</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {balanceSheet.assets.map((item:any, idx:number) => (
                            <div key={idx} className="flex justify-between text-slate-700 dark:text-slate-300">
                              <span>{item.name}</span>
                              <span className="font-medium">{formatPrice(item.balance)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center pt-6 mt-6 border-t-2 border-slate-200 dark:border-slate-700">
                          <span className="font-bold text-lg dark:text-white">Total Aset</span>
                          <span className="font-bold text-xl text-sky-600 dark:text-sky-400">{formatPrice(balanceSheet.totalAssets)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* KEWAJIBAN & EKUITAS */}
                    <div className="space-y-8">
                      <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                        <CardHeader className="bg-rose-50 dark:bg-rose-900/20 rounded-t-2xl border-b border-rose-100 dark:border-rose-900/50">
                          <CardTitle className="text-rose-800 dark:text-rose-300">KEWAJIBAN (LIABILITIES)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            {balanceSheet.liabilities.map((item:any, idx:number) => (
                              <div key={idx} className="flex justify-between text-slate-700 dark:text-slate-300">
                                <span>{item.name}</span>
                                <span className="font-medium">{formatPrice(item.balance)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
                            <span className="font-semibold dark:text-slate-200">Total Kewajiban</span>
                            <span className="font-semibold dark:text-slate-200">{formatPrice(balanceSheet.totalLiabilities)}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                        <CardHeader className="bg-indigo-50 dark:bg-indigo-900/20 rounded-t-2xl border-b border-indigo-100 dark:border-indigo-900/50">
                          <CardTitle className="text-indigo-800 dark:text-indigo-300">EKUITAS (EQUITY)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            {balanceSheet.equity.map((item:any, idx:number) => (
                              <div key={idx} className="flex justify-between text-slate-700 dark:text-slate-300">
                                <span>{item.name}</span>
                                <span className="font-medium">{formatPrice(item.balance)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
                            <span className="font-semibold dark:text-slate-200">Total Ekuitas</span>
                            <span className="font-semibold dark:text-slate-200">{formatPrice(balanceSheet.totalEquity)}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex justify-between items-center p-6 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl shadow-lg">
                        <span className="font-bold text-lg">Total Kewajiban & Ekuitas</span>
                        <span className="font-bold text-xl">{formatPrice(balanceSheet.totalLiabilities + balanceSheet.totalEquity)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ARUS KAS */}
              {activeTab === 'cashflow' && cashFlow && (
                <div className="max-w-4xl mx-auto">
                  <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 pb-6">
                      <CardTitle className="text-2xl">Laporan Arus Kas</CardTitle>
                      <p className="text-slate-500 mt-2">Metode Langsung</p>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                      
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Arus Kas dari Aktivitas Operasi</h3>
                        <div className="space-y-3 pl-4">
                          <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Penerimaan Kas dari Pelanggan (Sales) dsb</span>
                            <span className="text-emerald-600">{formatPrice(cashFlow.operatingActivity.inflow)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Pembayaran Kas untuk Beban & Supplier</span>
                            <span className="text-red-500">({formatPrice(cashFlow.operatingActivity.outflow)})</span>
                          </div>
                          <div className="flex justify-between font-semibold pt-2 border-t border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                            <span>Kas Bersih dari Aktivitas Operasi</span>
                            <span>{formatPrice(cashFlow.operatingActivity.net)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Arus Kas dari Aktivitas Investasi</h3>
                        <div className="space-y-3 pl-4">
                          <div className="flex justify-between font-semibold pt-2 text-slate-800 dark:text-slate-200">
                            <span>Kas Bersih dari Aktivitas Investasi</span>
                            <span>{formatPrice(cashFlow.investingActivity)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Arus Kas dari Aktivitas Pendanaan</h3>
                        <div className="space-y-3 pl-4">
                          <div className="flex justify-between font-semibold pt-2 text-slate-800 dark:text-slate-200">
                            <span>Kas Bersih dari Aktivitas Pendanaan</span>
                            <span>{formatPrice(cashFlow.financingActivity)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-6 border-t-2 border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-900/20 px-6 rounded-xl mt-8">
                        <span className="font-bold text-xl text-sky-900 dark:text-sky-100">Kenaikan (Penurunan) Kas Bersih</span>
                        <span className={`font-bold text-2xl ${cashFlow.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatPrice(cashFlow.netCashFlow)}
                        </span>
                      </div>

                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAB 6: AGING */}
              {activeTab === 'aging' && aging && (
                <div className="space-y-8">
                  {/* Piutang (AR) */}
                  <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 pb-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-t-2xl">
                      <CardTitle className="text-lg text-emerald-800 dark:text-emerald-400">Umur Piutang Usaha (Account Receivable Aging)</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900">
                          <p className="text-sm text-slate-500 mb-1">0-30 Hari</p>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{formatPrice(aging?.arAging?.['0-30'] || 0)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900">
                          <p className="text-sm text-slate-500 mb-1">31-60 Hari</p>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{formatPrice(aging?.arAging?.['31-60'] || 0)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900">
                          <p className="text-sm text-slate-500 mb-1">61-90 Hari</p>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{formatPrice(aging?.arAging?.['61-90'] || 0)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
                          <p className="text-sm text-red-600 dark:text-red-400 mb-1">&gt;90 Hari</p>
                          <p className="font-bold text-red-600 dark:text-red-400">{formatPrice(aging?.arAging?.['>90'] || 0)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 col-span-2 md:col-span-1 border border-emerald-200 dark:border-emerald-800">
                          <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium mb-1">Total Piutang</p>
                          <p className="font-bold text-lg text-emerald-700 dark:text-emerald-400">{formatPrice(aging?.arAging?.total || 0)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Hutang (AP) */}
                  <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 pb-4 bg-rose-50/50 dark:bg-rose-900/10 rounded-t-2xl">
                      <CardTitle className="text-lg text-rose-800 dark:text-rose-400">Umur Hutang Usaha (Account Payable Aging)</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900">
                          <p className="text-sm text-slate-500 mb-1">0-30 Hari</p>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{formatPrice(aging?.apAging?.['0-30'] || 0)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900">
                          <p className="text-sm text-slate-500 mb-1">31-60 Hari</p>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{formatPrice(aging?.apAging?.['31-60'] || 0)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900">
                          <p className="text-sm text-slate-500 mb-1">61-90 Hari</p>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{formatPrice(aging?.apAging?.['61-90'] || 0)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                          <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">&gt;90 Hari</p>
                          <p className="font-bold text-orange-600 dark:text-orange-400">{formatPrice(aging?.apAging?.['>90'] || 0)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-rose-100 dark:bg-rose-900/40 col-span-2 md:col-span-1 border border-rose-200 dark:border-rose-800">
                          <p className="text-sm text-rose-800 dark:text-rose-300 font-medium mb-1">Total Hutang</p>
                          <p className="font-bold text-lg text-rose-700 dark:text-rose-400">{formatPrice(aging?.apAging?.total || 0)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
