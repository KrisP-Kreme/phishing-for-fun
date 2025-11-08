import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const emailRouter = createTRPCRouter({
  saveEmail: publicProcedure
    .input(z.object({
      to: z.string().email(),
      subject: z.string(),
      body: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Store in memory or database
      return {
        id: Math.random().toString(36).substr(2, 9),
        ...input,
        savedAt: new Date(),
      };
    }),
});
