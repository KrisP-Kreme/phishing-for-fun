import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const llmRouter = createTRPCRouter({
  generateEmail: publicProcedure
    .input(z.object({
      targetEmail: z.string().email(),
      domain: z.string(),
      description: z.string(),
      tone: z.enum(['professional', 'casual', 'friendly']),
    }))
    .mutation(async ({ input }) => {
      const prompt = `Generate a professional outreach email to ${input.targetEmail} from domain ${input.domain}.
Context: ${input.description}
Tone: ${input.tone}

Create a compelling subject line and email body.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      return {
        subject: 'Generated Subject Line',
        body: completion.choices[0]?.message?.content || '',
        generatedAt: new Date(),
      };
    }),
});
