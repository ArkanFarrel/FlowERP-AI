import { z } from 'zod';

export const salesItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
});

export const createSalesOrderSchema = z.object({
  body: z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    tax: z.number().min(0).default(0),
    discount: z.number().min(0).default(0),
    items: z.array(salesItemSchema).min(1, 'At least one item is required'),
  }),
});

export const createSimpleSalesOrderSchema = z.object({
  body: z.object({
    orderNumber: z.string().optional(),
    customerName: z.string().min(1, 'Customer name is required'),
    salesperson: z.string().optional(),
    orderDate: z.string().optional(),
    totalAmount: z.number().min(0, 'Total amount must be non-negative'),
    paymentStatus: z.enum(['Paid', 'Pending', 'Overdue']).default('Paid'),
    status: z.enum(['Quotation', 'Confirmed', 'Processing', 'Completed', 'Cancelled']).default('Processing'),
    deliveryStatus: z.enum(['Processing', 'Shipping', 'Delivered']).default('Shipping'),
  }),
});

export const updateSalesStatusSchema = z.object({
  body: z.object({
    paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE']).optional(),
    status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED']).optional(),
  }),
});

export type CreateSalesOrderDto = z.infer<typeof createSalesOrderSchema>['body'];
export type CreateSimpleSalesOrderDto = z.infer<typeof createSimpleSalesOrderSchema>['body'];
export type UpdateSalesStatusDto = z.infer<typeof updateSalesStatusSchema>['body'];
