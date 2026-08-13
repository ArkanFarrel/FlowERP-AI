/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { backendFetch } from '@/lib/backend-api';
import { revalidatePath } from 'next/cache';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ARItem {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  paymentStatus: string;
  createdAt: string;
  dueDate?: string;
  customer: {
    id: string;
    name: string;
    companyName?: string;
    email?: string;
    phone?: string;
  };
  salesperson?: { fullName?: string };
  payments: PaymentRecord[];
}

export interface APItem {
  id: string;
  poNumber: string;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  paymentStatus: string;
  createdAt: string;
  dueDate?: string;
  supplier: {
    id: string;
    name: string;
    companyName?: string;
    email?: string;
    phone?: string;
  };
  createdBy?: { fullName?: string };
  payments: PaymentRecord[];
  items?: Array<{ product?: { name: string }; quantity: number; unitCost: number }>;
}

export interface PaymentRecord {
  id: string;
  referenceNumber: string;
  type: string;
  amount: number;
  method: string;
  notes?: string;
  paymentDate: string;
  createdAt: string;
}

export interface AgingBuckets<T> {
  current: T[];    // 0–30 days
  days30: T[];     // 31–60 days
  days60: T[];     // 61–90 days
  days90Plus: T[]; // 91+ days
}

export interface FinanceSummary {
  totalReceivables: number;
  totalPayables: number;
  overdueReceivables: number;
  overduePayables: number;
  openARCount: number;
  openAPCount: number;
}

export interface CustomerBalance {
  customerId: string;
  customerName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  orderCount: number;
  oldestOrderDate: string;
}

export interface SupplierBalance {
  supplierId: string;
  supplierName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  orderCount: number;
  oldestOrderDate: string;
}

// ─── AR (Accounts Receivable) ─────────────────────────────────────────────────

export async function getReceivables(): Promise<{ success: boolean; data: ARItem[] }> {
  try {
    const res = await backendFetch<ARItem[]>('/finance/receivables');
    return { success: true, data: res.data ?? [] };
  } catch (e) {
    console.error('getReceivables error:', e);
    return { success: false, data: [] };
  }
}

export async function getReceivablesAging(): Promise<{ success: boolean; data: AgingBuckets<ARItem & { daysSince: number }> | null }> {
  try {
    const res = await backendFetch<AgingBuckets<ARItem & { daysSince: number }>>('/finance/receivables/aging');
    return { success: true, data: res.data ?? null };
  } catch (e) {
    console.error('getReceivablesAging error:', e);
    return { success: false, data: null };
  }
}

export async function getSalesOrderPayments(salesOrderId: string): Promise<{ success: boolean; data: PaymentRecord[] }> {
  try {
    const res = await backendFetch<PaymentRecord[]>(`/finance/receivables/${salesOrderId}/payments`);
    return { success: true, data: res.data ?? [] };
  } catch (e) {
    console.error('getSalesOrderPayments error:', e);
    return { success: false, data: [] };
  }
}

export async function recordReceivablePayment(data: {
  salesOrderId: string;
  amount: number;
  method: string;
  notes?: string;
  paymentDate?: string;
}): Promise<{ success: boolean; data?: { referenceNumber: string; remainingBalance: number }; message?: string }> {
  try {
    const res = await backendFetch('/finance/receivables/pay', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    revalidatePath('/Finance');
    return { success: true, data: res.data as any };
  } catch (e: any) {
    return { success: false, message: e.message || 'Gagal mencatat pembayaran' };
  }
}

// ─── AP (Accounts Payable) ────────────────────────────────────────────────────

export async function getPayables(): Promise<{ success: boolean; data: APItem[] }> {
  try {
    const res = await backendFetch<APItem[]>('/finance/payables');
    return { success: true, data: res.data ?? [] };
  } catch (e) {
    console.error('getPayables error:', e);
    return { success: false, data: [] };
  }
}

export async function getPayablesAging(): Promise<{ success: boolean; data: AgingBuckets<APItem & { daysSince: number }> | null }> {
  try {
    const res = await backendFetch<AgingBuckets<APItem & { daysSince: number }>>('/finance/payables/aging');
    return { success: true, data: res.data ?? null };
  } catch (e) {
    console.error('getPayablesAging error:', e);
    return { success: false, data: null };
  }
}

export async function getPurchaseOrderPayments(purchaseOrderId: string): Promise<{ success: boolean; data: PaymentRecord[] }> {
  try {
    const res = await backendFetch<PaymentRecord[]>(`/finance/payables/${purchaseOrderId}/payments`);
    return { success: true, data: res.data ?? [] };
  } catch (e) {
    console.error('getPurchaseOrderPayments error:', e);
    return { success: false, data: [] };
  }
}

export async function recordPayablePayment(data: {
  purchaseOrderId: string;
  amount: number;
  method: string;
  notes?: string;
  paymentDate?: string;
}): Promise<{ success: boolean; data?: { referenceNumber: string; remainingBalance: number }; message?: string }> {
  try {
    const res = await backendFetch('/finance/payables/pay', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    revalidatePath('/Finance');
    return { success: true, data: res.data as any };
  } catch (e: any) {
    return { success: false, message: e.message || 'Gagal mencatat pembayaran' };
  }
}

// ─── Per-Party Balances ──────────────────────────────────────────────────────────────────

export async function getCustomerBalances(): Promise<{ success: boolean; data: CustomerBalance[] }> {
  try {
    const res = await backendFetch<CustomerBalance[]>('/finance/receivables/customer-balances');
    return { success: true, data: res.data ?? [] };
  } catch (e) {
    console.error('getCustomerBalances error:', e);
    return { success: false, data: [] };
  }
}

export async function getSupplierBalances(): Promise<{ success: boolean; data: SupplierBalance[] }> {
  try {
    const res = await backendFetch<SupplierBalance[]>('/finance/payables/supplier-balances');
    return { success: true, data: res.data ?? [] };
  } catch (e) {
    console.error('getSupplierBalances error:', e);
    return { success: false, data: [] };
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export async function getFinanceSummary(): Promise<{ success: boolean; data: FinanceSummary | null }> {
  try {
    const res = await backendFetch<FinanceSummary>('/finance/summary');
    return { success: true, data: res.data ?? null };
  } catch (e) {
    console.error('getFinanceSummary error:', e);
    return { success: false, data: null };
  }
}
