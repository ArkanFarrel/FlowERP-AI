import { prisma } from '../../config/database.config.js';
import { PurchaseOrder, PurchaseStatus } from '@prisma/client';

export class PurchaseRepository {
  async findAllByCompany(
    companyId: string,
    params?: { supplierId?: string; status?: PurchaseStatus }
  ): Promise<PurchaseOrder[]> {
    return prisma.purchaseOrder.findMany({
      where: {
        companyId,
        ...(params?.supplierId ? { supplierId: params.supplierId } : {}),
        ...(params?.status ? { status: params.status } : {}),
      },
      include: {
        supplier: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(companyId: string, id: string): Promise<PurchaseOrder | null> {
    return prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: { include: { product: true } },
      },
    });
  }

  async createPurchaseOrder(
    companyId: string,
    createdById: string,
    data: {
      supplierId: string;
      poNumber: string;
      subtotal: number;
      tax: number;
      totalAmount: number;
      items: { productId: string; quantity: number; unitCost: number; subtotal: number }[];
    }
  ) {
    return prisma.purchaseOrder.create({
      data: {
        companyId,
        poNumber: data.poNumber,
        supplierId: data.supplierId,
        createdById,
        subtotal: data.subtotal,
        tax: data.tax,
        totalAmount: data.totalAmount,
        status: 'PENDING',
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            subtotal: item.subtotal,
          })),
        },
      },
      include: { items: { include: { product: true } }, supplier: true },
    });
  }

  async receiveGoods(companyId: string, purchaseOrderId: string) {
    return prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirstOrThrow({
        where: { id: purchaseOrderId, companyId },
        include: { items: true },
      });

      if (po.status === 'RECEIVED' || po.status === 'COMPLETED') {
        throw new Error('Purchase order has already been received');
      }

      // 1. Increment product stock & log STOCK_IN movements
      for (const item of po.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            companyId,
            productId: item.productId,
            type: 'STOCK_IN',
            quantity: item.quantity,
            reference: po.poNumber,
            notes: `Goods received from Purchase Order ${po.poNumber}`,
          },
        });
      }

      // 2. Update PurchaseOrder status to RECEIVED
      return tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: 'RECEIVED' },
        include: { items: { include: { product: true } }, supplier: true },
      });
    });
  }
}
