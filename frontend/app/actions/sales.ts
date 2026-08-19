'use server';

import { prisma } from "@/lib/prisma";
import { ensureDefaultCompany } from "@/lib/company";
import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalesOrderItem {
  order: string;
  dbId: string;
  customer: string;
  salesperson: string;
  date: string;
  items: number;
  subtotal: string;
  tax: string;
  total: string;
  payment: string;
  status: string;
  delivery: string;
}

interface BackendSalesOrder {
  id: string;
  orderNumber: string;
  customer?: { name?: string; companyName?: string };
  salesperson?: { fullName?: string };
  createdAt: string;
  items?: Array<{ product?: { name?: string }; quantity?: number; unitPrice?: number; subtotal?: number }>;
  subtotal: number;
  tax: number;
  discount?: number;
  totalAmount: number;
  paymentStatus: string;
  status: string;
  invoices?: Array<{ invoiceNumber?: string }>;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapPaymentStatus(status: string): string {
  const map: Record<string, string> = {
    PAID: 'Paid', UNPAID: 'Pending', PARTIAL: 'Pending', OVERDUE: 'Overdue',
    Paid: 'Paid', Pending: 'Pending', Overdue: 'Overdue',
  };
  return map[status] || 'Pending';
}

function mapOrderStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Confirmed', PROCESSING: 'Processing', SHIPPED: 'Shipping',
    COMPLETED: 'Completed', CANCELLED: 'Cancelled',
    Confirmed: 'Confirmed', Processing: 'Processing', Completed: 'Completed',
    Cancelled: 'Cancelled', Quotation: 'Quotation',
  };
  return map[status] || status;
}

function mapDeliveryStatus(orderStatus: string, deliveryStatus?: string): string {
  if (deliveryStatus) {
    const map: Record<string, string> = {
      Processing: 'Processing', Shipping: 'Shipping', Delivered: 'Delivered',
    };
    if (map[deliveryStatus]) return map[deliveryStatus];
  }
  const statusMap: Record<string, string> = {
    PENDING: 'Processing', PROCESSING: 'Shipping', SHIPPED: 'Shipping',
    COMPLETED: 'Delivered', CANCELLED: 'Processing',
  };
  return statusMap[orderStatus] || 'Shipping';
}

function formatCurrency(value: number): string {
  return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function mapBackendToSalesItem(s: BackendSalesOrder): SalesOrderItem {
  return {
    order: s.orderNumber,
    dbId: s.id,
    customer: s.customer?.companyName || s.customer?.name || 'Walk-in Customer',
    salesperson: s.salesperson?.fullName || 'Admin',
    date: formatDate(s.createdAt),
    items: s.items?.length ?? 0,
    subtotal: formatCurrency(s.subtotal || 0),
    tax: formatCurrency(s.tax || 0),
    total: formatCurrency(s.totalAmount || 0),
    payment: mapPaymentStatus(s.paymentStatus),
    status: mapOrderStatus(s.status),
    delivery: mapDeliveryStatus(s.status),
  };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Fetch all sales orders from Prisma DB with fallback to REST API backend.
 */
export async function getSales(): Promise<{ success: boolean; data: SalesOrderItem[]; total?: number }> {
  try {
    const company = await ensureDefaultCompany();
    const sales = await prisma.sale.findMany({
      where: { companyId: company.id },
      include: { customer: true, salesperson: true, items: true },
      orderBy: { createdAt: "desc" },
    });

    const mapped: SalesOrderItem[] = sales.map((s) => ({
      order: s.orderNumber,
      dbId: s.id,
      customer: s.customer?.company || s.customer?.name || 'Walk-in Customer',
      salesperson: s.salesperson?.name || 'Admin',
      date: formatDate(s.createdAt),
      items: s.items?.length || 0,
      subtotal: formatCurrency(s.subtotal || 0),
      tax: formatCurrency(s.tax || 0),
      total: formatCurrency(s.total || 0),
      payment: s.paymentStatus || 'Paid',
      status: s.status || 'Completed',
      delivery: s.deliveryStatus || 'Delivered',
    }));

    if (mapped.length > 0) {
      return { success: true, data: mapped, total: mapped.length };
    }
  } catch (err) {
    console.warn('[getSales] Prisma error, trying backendFetch fallback:', err instanceof Error ? err.message : String(err));
  }

  try {
    const res = await backendFetch<BackendSalesOrder[]>('/sales');
    if (res.success && res.data) {
      const mapped = res.data.map(mapBackendToSalesItem);
      return { success: true, data: mapped, total: mapped.length };
    }
  } catch {
    // ignore
  }

  return { success: true, data: [] };
}

/**
 * Fetch sales metrics overview.
 */
export async function getSalesMetrics() {
  try {
    const salesRes = await getSales();
    const salesList = salesRes.data || [];
    const ordersCount = salesList.length;
    const totalRev = salesList.reduce((acc, s) => {
      const val = Number(String(s.total || 0).replace(/[^0-9.-]+/g, '')) || 0;
      return acc + val;
    }, 0);
    const paidCount = salesList.filter((s) => s.payment === 'Paid').length;
    const pendingCount = salesList.filter((s) => s.payment === 'Pending' || s.payment === 'Overdue').length;
    const completedCount = salesList.filter((s) => s.status === 'Completed').length;
    const avgVal = ordersCount > 0 ? Math.round(totalRev / ordersCount) : 0;

    const dataObj = {
      totalRevenue: totalRev,
      ordersCount,
      totalOrders: ordersCount,
      paidCount,
      pendingCount,
      completedCount,
      completedOrders: completedCount,
      avgOrderValue: avgVal,
      averageOrderValue: avgVal,
    };

    return {
      success: true,
      data: dataObj,
      ...dataObj,
    };
  } catch (error) {
    console.error('getSalesMetrics error:', error);
    const emptyObj = {
      totalRevenue: 0,
      ordersCount: 0,
      totalOrders: 0,
      paidCount: 0,
      pendingCount: 0,
      completedCount: 0,
      completedOrders: 0,
      avgOrderValue: 0,
      averageOrderValue: 0,
    };
    return {
      success: false,
      data: emptyObj,
      ...emptyObj,
    };
  }
}

/**
 * Create a new sales order natively in Prisma PostgreSQL DB.
 */
export async function createSalesOrder(data: {
  orderNumber: string;
  customerName: string;
  salesperson?: string;
  orderDate?: string;
  totalAmount: number;
  paymentStatus?: string;
  status?: string;
  deliveryStatus?: string;
}): Promise<{ success: boolean; data?: SalesOrderItem; error?: string }> {
  try {
    const company = await ensureDefaultCompany();
    const orderNo = data.orderNumber || `SO-${Math.floor(10000 + Math.random() * 90000)}`;
    const totalVal = Number(data.totalAmount) || 0;

    let customer = await prisma.customer.findFirst({
      where: { companyId: company.id, name: data.customerName },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          code: `CUS-${Math.floor(10000 + Math.random() * 90000)}`,
          name: data.customerName,
          company: data.customerName,
          email: `${data.customerName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          phone: '-',
          city: 'Jakarta',
          country: 'Indonesia',
          companyId: company.id,
        },
      });
    }

    const sale = await prisma.sale.create({
      data: {
        orderNumber: orderNo,
        total: totalVal,
        subtotal: totalVal * 0.9,
        tax: totalVal * 0.1,
        customerId: customer.id,
        companyId: company.id,
      },
      include: { customer: true },
    });

    revalidatePath("/Sales");
    revalidatePath("/Dashboard");

    return {
      success: true,
      data: {
        order: sale.orderNumber,
        dbId: sale.id,
        customer: customer.name,
        salesperson: 'Admin',
        date: formatDate(sale.createdAt),
        items: 1,
        subtotal: formatCurrency(sale.subtotal),
        tax: formatCurrency(sale.tax),
        total: formatCurrency(sale.total),
        payment: 'Paid',
        status: 'Completed',
        delivery: 'Delivered',
      },
    };
  } catch (err) {
    console.error('createSalesOrder Prisma error:', err);
    return { success: false, error: 'Failed to create sales order' };
  }
}

/**
 * Process a multi-item POS Cashier Checkout transaction,
 * deduct product stock in real-time, and log stock movements.
 */
export async function createPOSCheckoutOrder(data: {
  orderNumber: string;
  customerName: string;
  customerId?: string;
  paymentMethod: string;
  subtotal: number;
  tax: number;
  discount: number;
  loyaltyDiscount?: number;
  pointsRedeemed?: number;
  pointsEarned?: number;
  totalAmount: number;
  cashTendered: number;
  changeAmount: number;
  items: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}) {
  try {
    const company = await ensureDefaultCompany();
    const orderNo = data.orderNumber || `POS-${Math.floor(10000 + Math.random() * 90000)}`;

    let customer = null;
    if (data.customerId) {
      customer = await prisma.customer.findFirst({
        where: { id: data.customerId, companyId: company.id },
      });
    }

    if (!customer) {
      customer = await prisma.customer.findFirst({
        where: { companyId: company.id, name: data.customerName || "Walk-in Customer" },
      });
    }

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          code: `CUS-${Math.floor(10000 + Math.random() * 90000)}`,
          name: data.customerName || "Walk-in Customer",
          company: "General Public",
          email: "walkin@pos.local",
          phone: "-",
          city: "Store",
          country: "Indonesia",
          companyId: company.id,
        },
      });
    }

    // Update customer loyalty points & lifetime value if registered customer
    if (customer && customer.name !== "Walk-in Customer") {
      const earned = data.pointsEarned ?? Math.max(1, Math.floor((data.totalAmount || 0) / 10));
      const redeemed = data.pointsRedeemed || 0;
      const currentPts = customer.loyaltyPoints || 0;
      const newPts = Math.max(0, currentPts - redeemed + earned);

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          loyaltyPoints: newPts,
          lifetimeValue: (customer.lifetimeValue || 0) + (Number(data.totalAmount) || 0),
        },
      });
    }

    const sale = await prisma.sale.create({
      data: {
        orderNumber: orderNo,
        total: Number(data.totalAmount) || 0,
        subtotal: Number(data.subtotal) || 0,
        tax: Number(data.tax) || 0,
        customerId: customer.id,
        companyId: company.id,
      },
      include: { customer: true },
    });

    // Deduct stock for each item & log stock movement in real-time
    for (const item of data.items) {
      if (item.productId) {
        try {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

          await prisma.stockMovement.create({
            data: {
              type: "STOCK_OUT",
              quantity: item.quantity,
              notes: `POS Checkout #${orderNo} (${item.quantity}x ${item.productName})`,
              productId: item.productId,
              companyId: company.id,
            },
          });
        } catch {
          // ignore individual item stock update errors if any
        }
      }
    }

    revalidatePath("/Sales");
    revalidatePath("/ProductInventory");
    revalidatePath("/Products");
    revalidatePath("/Dashboard");
    revalidatePath("/POS");

    return {
      success: true,
      data: {
        order: sale.orderNumber,
        dbId: sale.id,
        customer: customer.name,
        salesperson: "Cashier",
        date: new Date().toLocaleDateString(),
        items: data.items.length,
        subtotal: `$${data.subtotal.toLocaleString()}`,
        tax: `$${data.tax.toLocaleString()}`,
        total: `$${data.totalAmount.toLocaleString()}`,
        payment: "Paid",
        status: "Completed",
        delivery: "Delivered",
      },
    };
  } catch (err) {
    console.error("createPOSCheckoutOrder error:", err);
    return { success: false, error: "Gagal memproses transaksi kasir POS." };
  }
}

// ─── Types for Returns & Delivery Orders ──────────────────────────────────────

export interface SalesReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface DeliveryOrderData {
  doNumber: string;
  saleId: string;
  orderNumber: string;
  issueDate: string;
  customerName: string;
  customerAddress: string;
  items: Array<{ productName: string; sku: string; quantity: number; unit: string }>;
  status: string;
}

export async function createSalesReturn(data: {
  saleId: string;
  reason: string;
  returnType: 'REFUND' | 'EXCHANGE' | 'CREDIT_NOTE';
  items: SalesReturnItem[];
}): Promise<{ success: boolean; returnId?: string; refundAmount?: number; error?: string }> {
  try {
    const company = await ensureDefaultCompany();
    const returnId = `RTN-${Math.floor(10000 + Math.random() * 90000)}`;
    const sale = await prisma.sale.findFirst({
      where: { OR: [{ id: data.saleId }, { orderNumber: data.saleId }] },
    });
    if (!sale) return { success: false, error: 'Sales order tidak ditemukan' };
    let refundAmount = 0;
    for (const item of data.items) {
      refundAmount += item.quantity * item.unitPrice;
      if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        await prisma.stockMovement.create({
          data: {
            type: 'STOCK_IN',
            quantity: item.quantity,
            reference: returnId,
            notes: `Retur ${returnId} - ${data.returnType}. Alasan: ${data.reason}. Produk: ${item.productName}`,
            productId: item.productId,
            companyId: company.id,
          },
        });
      }
    }
    try {
      await prisma.notification.create({
        data: {
          title: `Retur Penjualan: ${returnId}`,
          message: `Order ${sale.orderNumber} - ${data.returnType}. Total refund: $${refundAmount.toLocaleString()}. Alasan: ${data.reason}`,
          type: 'info',
          companyId: company.id,
        },
      });
    } catch { /* ignore */ }
    revalidatePath('/Sales');
    revalidatePath('/ProductInventory');
    revalidatePath('/Dashboard');
    return { success: true, returnId, refundAmount };
  } catch (error) {
    console.error('createSalesReturn error:', error);
    return { success: false, error: 'Gagal memproses retur penjualan' };
  }
}

export async function generateDeliveryOrder(saleId: string): Promise<{ success: boolean; data?: DeliveryOrderData; error?: string }> {
  try {
    const sale = await prisma.sale.findFirst({
      where: { OR: [{ id: saleId }, { orderNumber: saleId }] },
      include: { customer: true, items: { include: { product: true } } },
    });
    if (!sale) return { success: false, error: 'Sales order tidak ditemukan' };
    return {
      success: true,
      data: {
        doNumber: `DO-${sale.orderNumber}`,
        saleId: sale.id,
        orderNumber: sale.orderNumber,
        issueDate: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
        customerName: sale.customer?.name || sale.customer?.company || 'Walk-in Customer',
        customerAddress: sale.customer?.address || sale.customer?.city || 'Jakarta, Indonesia',
        items: sale.items.map(item => ({
          productName: item.product?.name || 'Product',
          sku: item.product?.sku || '-',
          quantity: item.quantity,
          unit: item.product?.unit || 'pcs',
        })),
        status: 'Processing',
      },
    };
  } catch (error) {
    console.error('generateDeliveryOrder error:', error);
    return { success: false, error: 'Gagal membuat surat jalan' };
  }
}

export async function getSalesReturnHistory(): Promise<{ success: boolean; data: Array<{ id: string; returnId: string; productName: string; quantity: number; reason: string; time: string }> }> {
  try {
    const company = await ensureDefaultCompany();
    const movements = await prisma.stockMovement.findMany({
      where: { companyId: company.id, type: 'STOCK_IN', reference: { startsWith: 'RTN-' } },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      success: true,
      data: movements.map(m => ({
        id: m.id,
        returnId: m.reference || 'RTN-?',
        productName: m.product?.name || 'Product',
        quantity: m.quantity,
        reason: m.notes || '-',
        time: new Date(m.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      })),
    };
  } catch (error) {
    console.error('getSalesReturnHistory error:', error);
    return { success: false, data: [] };
  }
}
