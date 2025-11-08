import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import * as cheerio from 'cheerio';
import axios from 'axios';

export const scraperRouter = createTRPCRouter({
  scrapeEmails: publicProcedure
    .input(z.object({
      domain: z.string().url(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const response = await axios.get(input.domain);
        const $ = cheerio.load(response.data);
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = new Set<string>();

        $('body').text().match(emailRegex)?.forEach(email => {
          emails.add(email.toLowerCase());
        });

        $('a[href^="mailto:"]').each((_, element) => {
          const email = $(element).attr('href')?.replace('mailto:', '');
          if (email) emails.add(email.toLowerCase());
        });

        return {
          domain: input.domain,
          emails: Array.from(emails),
          description: input.description,
          scrapedAt: new Date(),
        };
      } catch (error) {
        throw new Error('Failed to scrape emails');
      }
    }),
});
