import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Customer name is required'),
    companyName: z.string().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    creditLimit: z.number().min(0).default(0),
    segment: z.string().default('Standard'),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    companyName: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    creditLimit: z.number().min(0).optional(),
    outstandingBalance: z.number().optional(),
    loyaltyPoints: z.number().int().optional(),
    healthScore: z.number().int().min(0).max(100).optional(),
    segment: z.string().optional(),
  }),
});

export type CreateCustomerDto = z.infer<typeof createCustomerSchema>['body'];
export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>['body'];
