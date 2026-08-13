'use server';

import { ensureDefaultCompany } from "@/lib/company";

/**
 * Mengambil daftar pengeluaran (expenses) perusahaan
 */
export async function getExpenses() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const company = await ensureDefaultCompany();
    const expenses = await prisma.expense.findMany({
      where: { companyId: company.id },
      orderBy: { date: 'desc' },
    });

    const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return {
      success: true,
      expenses: expenses.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amount: e.amount,
        date: new Date(e.date).toISOString().split('T')[0],
        notes: e.notes || '',
      })),
      totalExpense,
    };
  } catch (error) {
    console.error('getExpenses error:', error);
    return { success: false, error: 'Gagal mengambil data pengeluaran.' };
  }
}

/**
 * Menambahkan catatan pengeluaran operasional baru
 */
export async function createExpense(data: {
  title: string;
  category: string;
  amount: number;
  date?: string;
  notes?: string;
}) {
  try {
    const { prisma } = await import("@/lib/prisma");
    const company = await ensureDefaultCompany();
    if (!data.title || !data.amount) {
      return { success: false, error: 'Judul dan Jumlah Pengeluaran wajib diisi.' };
    }

    const newExpense = await prisma.expense.create({
      data: {
        title: data.title,
        category: data.category || 'Operational',
        amount: Number(data.amount),
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes || '',
        companyId: company.id,
      },
    });

    return {
      success: true,
      message: `Pengeluaran ${newExpense.title} sebesar $${newExpense.amount.toLocaleString()} berhasil dicatat.`,
      expense: newExpense,
    };
  } catch (error: unknown) {
    console.error('createExpense error:', error);
    const errMessage = error instanceof Error ? error.message : 'Gagal menambahkan catatan pengeluaran.';
    return { success: false, error: errMessage };
  }
}

/**
 * Menghapus catatan pengeluaran
 */
export async function deleteExpense(id: string) {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.expense.delete({ where: { id } });
    return { success: true, message: 'Catatan pengeluaran berhasil dihapus.' };
  } catch (error) {
    console.error('deleteExpense error:', error);
    return { success: false, error: 'Gagal menghapus pengeluaran.' };
  }
}

/**
 * Mengkalkulasi Laporan Laba Rugi Bersih (Profit & Loss Statement) secara riil dari database
 */
export async function getProfitAndLossStatement() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const company = await ensureDefaultCompany();

    const [salesAgg, purchasesAgg, expensesAgg, salesItems] = await Promise.all([
      prisma.sale.aggregate({
        where: { companyId: company.id },
        _sum: { total: true },
      }),
      prisma.purchase.aggregate({
        where: { companyId: company.id },
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: { companyId: company.id },
        _sum: { amount: true },
      }),
      prisma.saleItem.findMany({
        where: { sale: { companyId: company.id } },
        include: { product: { select: { costPrice: true } } },
      }),
    ]);

    // Gross Revenue (Total Omzet Penjualan)
    const grossRevenue = salesAgg._sum.total || 0;

    // Cost of Goods Sold (COGS / Harga Pokok Penjualan Produk)
    let cogs = salesItems.reduce((acc, item) => {
      const cost = item.product?.costPrice || 0;
      return acc + (cost * item.quantity);
    }, 0);

    // Fallback: Jika costPrice produk belum diisi di katalog, gunakan estimasi HPP standar 70% dari omzet penjualan atau total pembelian PO
    if (cogs === 0 && grossRevenue > 0) {
      cogs = Math.round(grossRevenue * 0.7);
    }

    // Purchase Expenses (Total Pembelian PO Supplier)
    const totalPurchases = purchasesAgg._sum.totalAmount || 0;

    // Gross Profit (Laba Kotor = Revenue - COGS)
    const grossProfit = grossRevenue - cogs;

    // Total Operational Expenses (Gaji, Listrik, Sewa, Logistic, dll)
    const totalOperationalExpenses = expensesAgg._sum.amount || 0;

    // Net Profit / (Loss) (Laba Rugi Bersih = Gross Profit - Operational Expenses)
    const netProfit = grossProfit - totalOperationalExpenses;

    const netProfitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    return {
      success: true,
      statement: {
        grossRevenue,
        cogs,
        totalPurchases,
        grossProfit,
        totalOperationalExpenses,
        netProfit,
        netProfitMargin: Number(netProfitMargin.toFixed(1)),
      },
    };
  } catch (error) {
    console.error('getProfitAndLossStatement error:', error);
    return { success: false, error: 'Gagal mengkalkulasi Laporan Laba Rugi.' };
  }
}
