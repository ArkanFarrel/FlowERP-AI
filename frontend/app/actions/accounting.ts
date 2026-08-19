'use server';

import { prisma } from "@/lib/prisma";
import { ensureDefaultCompany } from "@/lib/company";
import { revalidatePath } from "next/cache";
import fs from 'fs';
import path from 'path';

// Define Standard Accounts
const STANDARD_ACCOUNTS = [
  { code: '1000', name: 'Kas di Tangan', type: 'ASSET' },
  { code: '1100', name: 'Rekening Bank Utama', type: 'ASSET' },
  { code: '1200', name: 'Piutang Usaha / Accounts Receivable', type: 'ASSET' },
  { code: '1300', name: 'Persediaan Barang Dagang / Inventory', type: 'ASSET' },
  { code: '2000', name: 'Hutang Usaha / Accounts Payable', type: 'LIABILITY' },
  { code: '2100', name: 'Hutang Pajak PPN', type: 'LIABILITY' },
  { code: '3000', name: 'Modal Disetor / Owner\'s Capital', type: 'EQUITY' },
  { code: '3100', name: 'Laba Ditahan / Retained Earnings', type: 'EQUITY' },
  { code: '4000', name: 'Pendapatan Penjualan / Sales Revenue', type: 'REVENUE' },
  { code: '4100', name: 'Pendapatan Jasa & Lainnya', type: 'REVENUE' },
  { code: '5000', name: 'Beban Pokok Penjualan (HPP / COGS)', type: 'EXPENSE' },
  { code: '6000', name: 'Beban Operasional & Umum', type: 'EXPENSE' },
  { code: '6100', name: 'Beban Gaji & Upah Karyawan', type: 'EXPENSE' },
  { code: '6200', name: 'Beban Sewa & Fasilitas', type: 'EXPENSE' },
  { code: '6300', name: 'Beban Utilitas & Listrik', type: 'EXPENSE' },
];

export type JournalEntryType = {
  id: string;
  date: string;
  description: string;
  reference?: string;
  items: {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    notes?: string;
  }[];
  isManual?: boolean;
};

// Data persistence for custom accounts & manual journals
const dataFilePath = path.join(process.cwd(), 'data', 'accounting.json');

function getLocalData() {
  try {
    if (!fs.existsSync(path.dirname(dataFilePath))) {
      fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
    }
    if (fs.existsSync(dataFilePath)) {
      const content = fs.readFileSync(dataFilePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading local accounting data", error);
  }
  return { customAccounts: [], manualJournals: [] };
}

function saveLocalData(data: any) {
  try {
    if (!fs.existsSync(path.dirname(dataFilePath))) {
      fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error saving local accounting data", error);
  }
}

function getExpenseAccountCode(category: string) {
  const cat = category.toLowerCase();
  if (cat.includes('gaji') || cat.includes('salary')) return '6100';
  if (cat.includes('sewa') || cat.includes('rent')) return '6200';
  if (cat.includes('listrik') || cat.includes('utility')) return '6300';
  return '6000';
}

export async function getJournalEntries(filters?: { startDate?: string; endDate?: string }): Promise<JournalEntryType[]> {
  try {
    const company = await ensureDefaultCompany();
    const companyId = company.id;
    let entries: JournalEntryType[] = [];

    // Parse filters
    const dateFilter: any = {};
    if (filters?.startDate || filters?.endDate) {
      dateFilter.createdAt = {};
      if (filters?.startDate) dateFilter.createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) dateFilter.createdAt.lte = new Date(filters.endDate);
    }
    const dateFilterDate: any = {};
    if (filters?.startDate || filters?.endDate) {
      dateFilterDate.date = {};
      if (filters?.startDate) dateFilterDate.date.gte = new Date(filters.startDate);
      if (filters?.endDate) dateFilterDate.date.lte = new Date(filters.endDate);
    }
    const dateFilterOrder: any = {};
    if (filters?.startDate || filters?.endDate) {
      dateFilterOrder.orderDate = {};
      if (filters?.startDate) dateFilterOrder.orderDate.gte = new Date(filters.startDate);
      if (filters?.endDate) dateFilterOrder.orderDate.lte = new Date(filters.endDate);
    }

    // 1. Sales
    const sales = await prisma.sale.findMany({
      where: { companyId, ...dateFilterDate },
      include: { items: { include: { product: true } } }
    });

  for (const sale of sales) {
    // Revenue entry
    const isPaid = sale.paymentStatus === 'Paid';
    const debitAccount = isPaid ? '1100' : '1200';
    const debitAccountName = isPaid ? 'Rekening Bank Utama' : 'Piutang Usaha / Accounts Receivable';

    entries.push({
      id: `sale_${sale.id}`,
      date: sale.date.toISOString(),
      description: `Penjualan ${sale.orderNumber}`,
      reference: sale.orderNumber,
      items: [
        { accountCode: debitAccount, accountName: debitAccountName, debit: sale.total, credit: 0 },
        { accountCode: '4000', accountName: 'Pendapatan Penjualan / Sales Revenue', debit: 0, credit: sale.total }
      ]
    });

    // COGS entry
    let totalCogs = 0;
    for (const item of sale.items) {
      totalCogs += item.quantity * item.product.costPrice;
    }
    if (totalCogs > 0) {
      entries.push({
        id: `cogs_${sale.id}`,
        date: sale.date.toISOString(),
        description: `HPP Penjualan ${sale.orderNumber}`,
        reference: sale.orderNumber,
        items: [
          { accountCode: '5000', accountName: 'Beban Pokok Penjualan (HPP / COGS)', debit: totalCogs, credit: 0 },
          { accountCode: '1300', accountName: 'Persediaan Barang Dagang / Inventory', debit: 0, credit: totalCogs }
        ]
      });
    }
  }

  // 2. Purchases
  const purchases = await prisma.purchase.findMany({
    where: { companyId, ...dateFilterOrder },
  });

  for (const purchase of purchases) {
    // Assuming status Delivered means paid / fully settled for now or payable
    // Let's use 2000 (Payable) if not fully paid, but we don't have payment status on purchase.
    // We'll just assume all purchases increase Payable for standard accrued.
    entries.push({
      id: `purchase_${purchase.id}`,
      date: purchase.orderDate.toISOString(),
      description: `Pembelian ${purchase.poNumber}`,
      reference: purchase.poNumber,
      items: [
        { accountCode: '1300', accountName: 'Persediaan Barang Dagang / Inventory', debit: purchase.totalAmount, credit: 0 },
        { accountCode: '2000', accountName: 'Hutang Usaha / Accounts Payable', debit: 0, credit: purchase.totalAmount }
      ]
    });
  }

  // 3. Expenses
  const expenses = await prisma.expense.findMany({
    where: { companyId, ...dateFilterDate },
  });

  for (const expense of expenses) {
    const expenseCode = getExpenseAccountCode(expense.category);
    const expenseAcc = STANDARD_ACCOUNTS.find(a => a.code === expenseCode);
    entries.push({
      id: `expense_${expense.id}`,
      date: expense.date.toISOString(),
      description: `Beban: ${expense.title}`,
      reference: expense.category,
      items: [
        { accountCode: expenseCode, accountName: expenseAcc?.name || 'Beban Operasional & Umum', debit: expense.amount, credit: 0 },
        { accountCode: '1100', accountName: 'Rekening Bank Utama', debit: 0, credit: expense.amount }
      ]
    });
  }

  // 4. Manual Journals
  const localData = getLocalData();
  const manualJournals = localData.manualJournals || [];
  for (const mj of manualJournals) {
    // apply basic filter
    if (filters?.startDate && new Date(mj.date) < new Date(filters.startDate)) continue;
    if (filters?.endDate && new Date(mj.date) > new Date(filters.endDate)) continue;
    
    entries.push({
      ...mj,
      isManual: true
    });
  }

  // Sort by date desc
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return entries;
  } catch (error) {
    console.error("Error in getJournalEntries:", error);
    return [];
  }
}

export async function getChartOfAccounts() {
  const localData = getLocalData();
  const allAccounts = [...STANDARD_ACCOUNTS, ...(localData.customAccounts || [])];

  // Fetch all journal entries to calculate balances
  const journals = await getJournalEntries();

  const balances: Record<string, number> = {};
  for (const acc of allAccounts) {
    balances[acc.code] = 0;
  }

  for (const entry of journals) {
    for (const item of entry.items) {
      if (balances[item.accountCode] === undefined) {
        balances[item.accountCode] = 0;
      }
      const acc = allAccounts.find(a => a.code === item.accountCode);
      if (!acc) continue;

      if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
        balances[item.accountCode] += (item.debit - item.credit);
      } else {
        // LIABILITY, EQUITY, REVENUE
        balances[item.accountCode] += (item.credit - item.debit);
      }
    }
  }

  return allAccounts.map(acc => ({
    ...acc,
    balance: balances[acc.code] || 0
  }));
}

export async function createAccount(data: { code: string; name: string; type: string; description?: string }) {
  const localData = getLocalData();
  
  // check if exist
  const exists = STANDARD_ACCOUNTS.find(a => a.code === data.code) || localData.customAccounts.find((a: any) => a.code === data.code);
  if (exists) {
    throw new Error('Account code already exists');
  }

  localData.customAccounts.push(data);
  saveLocalData(localData);
  revalidatePath('/Accounting');
  return { success: true };
}

export async function createManualJournalEntry(data: { date: string; description: string; reference?: string; items: any[] }) {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const item of data.items) {
    totalDebit += Number(item.debit) || 0;
    totalCredit += Number(item.credit) || 0;
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error('Debit and Credit must be balanced');
  }

  const localData = getLocalData();
  const newJournal = {
    id: `manual_${Date.now()}`,
    ...data
  };
  
  if (!localData.manualJournals) localData.manualJournals = [];
  localData.manualJournals.push(newJournal);
  
  saveLocalData(localData);
  revalidatePath('/Accounting');
  return { success: true };
}

export async function getProfitAndLossReport(startDate?: string, endDate?: string) {
  try {
    const entries = await getJournalEntries({ startDate, endDate });
    const allAccounts = await getChartOfAccounts(); // to get types
    
    const typeMap: Record<string, string> = {};
    allAccounts.forEach(a => { typeMap[a.code] = a.type; });

    let revenue = 0;
    let cogs = 0;
    const operatingExpenses: Record<string, {name: string, amount: number}> = {};
    let totalOperatingExpenses = 0;

    for (const entry of entries) {
      for (const item of entry.items) {
        const type = typeMap[item.accountCode];
        
        if (type === 'REVENUE') {
          revenue += (item.credit - item.debit);
        } else if (item.accountCode === '5000') {
          cogs += (item.debit - item.credit);
        } else if (type === 'EXPENSE' && item.accountCode !== '5000') {
          const amt = (item.debit - item.credit);
          if (!operatingExpenses[item.accountCode]) {
            operatingExpenses[item.accountCode] = { name: item.accountName, amount: 0 };
          }
          operatingExpenses[item.accountCode].amount += amt;
          totalOperatingExpenses += amt;
        }
      }
    }

    const grossProfit = revenue - cogs;
    const netIncome = grossProfit - totalOperatingExpenses;

    return {
      revenue,
      cogs,
      grossProfit,
      operatingExpenses: Object.values(operatingExpenses),
      totalOperatingExpenses,
      netIncome
    };
  } catch (error) {
    console.error("Error in getProfitAndLossReport:", error);
    return {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: [],
      totalOperatingExpenses: 0,
      netIncome: 0
    };
  }
}

export async function getBalanceSheetReport(asOfDate?: string) {
  try {
    const entries = await getJournalEntries({ endDate: asOfDate });
    const allAccounts = await getChartOfAccounts(); 
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let currentPeriodEarnings = 0;

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];

    const balances: Record<string, number> = {};
    for (const a of allAccounts) balances[a.code] = 0;

    for (const entry of entries) {
      for (const item of entry.items) {
        if (balances[item.accountCode] === undefined) balances[item.accountCode] = 0;
        const type = allAccounts.find(a => a.code === item.accountCode)?.type;
        
        if (type === 'ASSET' || type === 'EXPENSE') {
          balances[item.accountCode] += (item.debit - item.credit);
        } else {
          balances[item.accountCode] += (item.credit - item.debit);
        }

        // Track earnings
        if (type === 'REVENUE') currentPeriodEarnings += (item.credit - item.debit);
        if (type === 'EXPENSE') currentPeriodEarnings -= (item.debit - item.credit);
      }
    }

    for (const acc of allAccounts) {
      if (balances[acc.code] === 0 && acc.code !== '3100') continue;

      if (acc.type === 'ASSET') {
        assets.push({ ...acc, balance: balances[acc.code] });
        totalAssets += balances[acc.code];
      } else if (acc.type === 'LIABILITY') {
        liabilities.push({ ...acc, balance: balances[acc.code] });
        totalLiabilities += balances[acc.code];
      } else if (acc.type === 'EQUITY') {
        let bal = balances[acc.code];
        if (acc.code === '3100') {
          bal += currentPeriodEarnings;
        }
        equity.push({ ...acc, balance: bal });
        totalEquity += bal;
      }
    }

    return {
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.1
    };
  } catch (error) {
    console.error("Error in getBalanceSheetReport:", error);
    return {
      assets: [],
      liabilities: [],
      equity: [],
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      isBalanced: true
    };
  }
}

export async function getCashFlowStatement(startDate?: string, endDate?: string) {
  try {
    const entries = await getJournalEntries({ startDate, endDate });
    
    let operatingInflow = 0;
    let operatingOutflow = 0;
    let investingFlow = 0;
    let financingFlow = 0;

    for (const entry of entries) {
      let cashChange = 0;
      let isOp = false, isInv = false, isFin = false;
      
      for (const item of entry.items) {
        if (item.accountCode === '1000' || item.accountCode === '1100') {
          cashChange += (item.debit - item.credit);
        } else {
          const prefix = item.accountCode.substring(0, 1);
          if (prefix === '4' || prefix === '5' || prefix === '6' || prefix === '1' || prefix === '2') isOp = true;
          if (prefix === '3') isFin = true;
        }
      }

      if (cashChange !== 0) {
        if (isFin) financingFlow += cashChange;
        else if (isOp) {
          if (cashChange > 0) operatingInflow += cashChange;
          else operatingOutflow += Math.abs(cashChange);
        } else {
          investingFlow += cashChange;
        }
      }
    }

    return {
      operatingActivity: {
        inflow: operatingInflow,
        outflow: operatingOutflow,
        net: operatingInflow - operatingOutflow
      },
      investingActivity: investingFlow,
      financingActivity: financingFlow,
      netCashFlow: (operatingInflow - operatingOutflow) + investingFlow + financingFlow
    };
  } catch (error) {
    console.error("Error in getCashFlowStatement:", error);
    return {
      operatingActivity: { inflow: 0, outflow: 0, net: 0 },
      investingActivity: 0,
      financingActivity: 0,
      netCashFlow: 0
    };
  }
}

export async function getARAPAgingSummary() {
  try {
    const company = await ensureDefaultCompany();
    const now = new Date();
    
    const arAging = { '0-30': 0, '31-60': 0, '61-90': 0, '>90': 0, total: 0 };
    const apAging = { '0-30': 0, '31-60': 0, '61-90': 0, '>90': 0, total: 0 };

    // Sales (AR) - unpaid
    const unpaidSales = await prisma.sale.findMany({
      where: { companyId: company.id, paymentStatus: { in: ['Pending', 'Overdue'] } }
    });

    for (const sale of unpaidSales) {
      const days = Math.floor((now.getTime() - sale.date.getTime()) / (1000 * 3600 * 24));
      const amount = sale.total;
      arAging.total += amount;
      if (days <= 30) arAging['0-30'] += amount;
      else if (days <= 60) arAging['31-60'] += amount;
      else if (days <= 90) arAging['61-90'] += amount;
      else arAging['>90'] += amount;
    }

    // Purchases (AP) - unpaid
    const unpaidPurchases = await prisma.purchase.findMany({
      where: { companyId: company.id, status: { not: 'Cancelled' } } 
    });

    for (const purchase of unpaidPurchases) {
      if (purchase.status === 'Delivered') continue;

      const days = Math.floor((now.getTime() - purchase.orderDate.getTime()) / (1000 * 3600 * 24));
      const amount = purchase.totalAmount;
      apAging.total += amount;
      if (days <= 30) apAging['0-30'] += amount;
      else if (days <= 60) apAging['31-60'] += amount;
      else if (days <= 90) apAging['61-90'] += amount;
      else apAging['>90'] += amount;
    }

    return { arAging, apAging };
  } catch (error) {
    console.error("Error in getARAPAgingSummary:", error);
    return {
      arAging: { '0-30': 0, '31-60': 0, '61-90': 0, '>90': 0, total: 0 },
      apAging: { '0-30': 0, '31-60': 0, '61-90': 0, '>90': 0, total: 0 }
    };
  }
}
