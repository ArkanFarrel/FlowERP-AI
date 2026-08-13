import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    sku: z.string().min(1, 'SKU is required'),
    barcode: z.string().optional(),
    name: z.string().min(1, 'Product name is required'),
    categoryId: z.string().optional(),
    categoryName: z.string().optional(),
    supplierId: z.string().optional(),
    brand: z.string().optional(),
    unit: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    costPrice: z.number().min(0).default(0),
    sellingPrice: z.number().min(0).default(0),
    tax: z.number().min(0).max(100).default(0),
    discount: z.number().min(0).max(100).default(0),
    stock: z.number().int().min(0).default(0),
    minimumStock: z.number().int().min(0).default(10),
    maximumStock: z.number().int().min(0).default(1000),
    warehouse: z.string().default('Central Store'),
    rackLocation: z.string().optional(),
    status: z.enum(['ACTIVE', 'DRAFT', 'INACTIVE']).default('ACTIVE'),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    sku: z.string().min(1).optional(),
    barcode: z.string().optional(),
    name: z.string().min(1).optional(),
    categoryId: z.string().optional(),
    categoryName: z.string().optional(),
    supplierId: z.string().optional(),
    brand: z.string().optional(),
    unit: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    costPrice: z.number().min(0).optional(),
    sellingPrice: z.number().min(0).optional(),
    tax: z.number().min(0).max(100).optional(),
    discount: z.number().min(0).max(100).optional(),
    stock: z.number().int().min(0).optional(),
    minimumStock: z.number().int().min(0).optional(),
    maximumStock: z.number().int().min(0).optional(),
    warehouse: z.string().optional(),
    rackLocation: z.string().optional(),
    status: z.enum(['ACTIVE', 'DRAFT', 'INACTIVE']).optional(),
  }),
});

export type CreateProductDto = z.infer<typeof createProductSchema>['body'];
export type UpdateProductDto = z.infer<typeof updateProductSchema>['body'];
