import { prisma } from '../../config/database.config.js';
import { StockMovement, StockMovementType } from '@prisma/client';

export class InventoryRepository {
  async findMovementsByCompany(
    companyId: string,
    params?: { productId?: string; type?: StockMovementType }
  ): Promise<StockMovement[]> {
    return prisma.stockMovement.findMany({
      where: {
        companyId,
        ...(params?.productId ? { productId: params.productId } : {}),
        ...(params?.type ? { type: params.type } : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            warehouse: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recordStockMovement(
    companyId: string,
    productId: string,
    type: StockMovementType,
    quantity: number,
    reference?: string,
    notes?: string
  ): Promise<StockMovement> {
    return prisma.$transaction(async (tx) => {
      // 1. Create StockMovement entry
      const movement = await tx.stockMovement.create({
        data: {
          companyId,
          productId,
          type,
          quantity,
          reference,
          notes,
        },
      });

      // 2. Adjust Product stock
      let stockChange = quantity;
      if (type === 'STOCK_OUT') stockChange = -quantity;

      await tx.product.update({
        where: { id: productId },
        data: {
          stock: { increment: stockChange },
        },
      });

      return movement;
    });
  }

  async setStockLevel(
    companyId: string,
    productId: string,
    newStockLevel: number,
    notes: string
  ): Promise<StockMovement> {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId },
      });

      const difference = newStockLevel - product.stock;

      const movement = await tx.stockMovement.create({
        data: {
          companyId,
          productId,
          type: 'ADJUSTMENT',
          quantity: Math.abs(difference),
          notes: `Stock adjusted from ${product.stock} to ${newStockLevel}. Reason: ${notes}`,
        },
      });

      await tx.product.update({
        where: { id: productId },
        data: { stock: newStockLevel },
      });

      return movement;
    });
  }
}
