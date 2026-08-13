import { z } from 'zod';

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Supplier name is required'),
    companyName: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    paymentTerms: z.string().optional(),
    rating: z.number().min(0).max(5).optional(),
    isActive: z.boolean().default(true),
  }),
});

export const updateSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    companyName: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    paymentTerms: z.string().optional(),
    rating: z.number().min(0).max(5).optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>['body'];
export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>['body'];
