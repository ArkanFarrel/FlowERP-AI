import { z } from 'zod';

export const stockMovementSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
    reference: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const stockAdjustmentSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    newStockLevel: z.number().int().min(0, 'New stock level must be 0 or greater'),
    notes: z.string().min(1, 'Reason for adjustment is required'),
  }),
});

export type StockMovementDto = z.infer<typeof stockMovementSchema>['body'];
export type StockAdjustmentDto = z.infer<typeof stockAdjustmentSchema>['body'];
