import { prisma } from '../../config/database.config.js';
import { SalesOrder, PaymentStatus, OrderStatus } from '@prisma/client';

export class SalesRepository {
  async findAllByCompany(
    companyId: string,
    params?: { customerId?: string; paymentStatus?: PaymentStatus; status?: OrderStatus }
  ) {
    return prisma.salesOrder.findMany({
      where: {
        companyId,
        ...(params?.customerId ? { customerId: params.customerId } : {}),
        ...(params?.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
        ...(params?.status ? { status: params.status } : {}),
      },
      include: {
        customer: true,
        salesperson: { select: { id: true, fullName: true, email: true } },
        items: { include: { product: true } },
        invoices: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(companyId: string, id: string): Promise<SalesOrder | null> {
    return prisma.salesOrder.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        salesperson: { select: { id: true, fullName: true, email: true } },
        items: { include: { product: true } },
        invoices: true,
      },
    });
  }

  async createSalesOrder(
    companyId: string,
    salespersonId: string,
    data: {
      customerId: string;
      orderNumber: string;
      subtotal: number;
      tax: number;
      discount: number;
      totalAmount: number;
      items: { productId: string; quantity: number; unitPrice: number; subtotal: number }[];
    }
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Create SalesOrder & items
      const salesOrder = await tx.salesOrder.create({
        data: {
          companyId,
          orderNumber: data.orderNumber,
          customerId: data.customerId,
          salespersonId,
          subtotal: data.subtotal,
          tax: data.tax,
          discount: data.discount,
          totalAmount: data.totalAmount,
          paymentStatus: 'PAID',
          status: 'COMPLETED',
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
      });

      // 2. Generate Invoice
      const invoiceNumber = `INV-${Date.now()}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      await tx.invoice.create({
        data: {
          companyId,
          salesOrderId: salesOrder.id,
          invoiceNumber,
          amount: data.totalAmount,
          paymentStatus: 'PAID',
          dueDate,
        },
      });

      // 3. Decrement product stock & record STOCK_OUT movements
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            companyId,
            productId: item.productId,
            type: 'STOCK_OUT',
            quantity: item.quantity,
            reference: salesOrder.orderNumber,
            notes: `Sales order fulfilled: ${salesOrder.orderNumber}`,
          },
        });
      }

      // 4. Update Customer outstanding balance & stats
      await tx.customer.update({
        where: { id: data.customerId },
        data: {
          loyaltyPoints: { increment: Math.floor(data.totalAmount / 10) },
        },
      });

      return tx.salesOrder.findUnique({
        where: { id: salesOrder.id },
        include: { items: { include: { product: true } }, invoices: true, customer: true },
      });
    });
  }

  async updateStatus(
    companyId: string,
    id: string,
    data: { paymentStatus?: PaymentStatus; status?: OrderStatus }
  ) {
    return prisma.salesOrder.update({
      where: { id },
      data,
    });
  }
}
