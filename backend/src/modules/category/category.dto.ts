import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Category name is required'),
    description: z.string().optional(),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  }),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>['body'];
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>['body'];
