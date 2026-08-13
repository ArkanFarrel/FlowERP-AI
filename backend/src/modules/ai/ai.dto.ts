import { z } from 'zod';

export const aiChatSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Prompt message is required'),
  }),
});

export type AiChatDto = z.infer<typeof aiChatSchema>['body'];
