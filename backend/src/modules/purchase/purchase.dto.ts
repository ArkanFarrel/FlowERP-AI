import { z } from 'zod';

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitCost: z.number().min(0, 'Unit cost must be non-negative'),
});

export const createPurchaseOrderSchema = z.object({
  body: z.object({
    supplierId: z.string().min(1, 'Supplier ID is required'),
    tax: z.number().min(0).default(0),
    items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
  }),
});

export type CreatePurchaseOrderDto = z.infer<typeof createPurchaseOrderSchema>['body'];
