import { createTRPCRouter } from './trpc';
import { scraperRouter } from './routers/scraper';
import { llmRouter } from './routers/llm';
import { emailRouter } from './routers/email';

export const appRouter = createTRPCRouter({
  scraper: scraperRouter,
  llm: llmRouter,
  email: emailRouter,
});

export type AppRouter = typeof appRouter;
