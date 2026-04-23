import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().url(),
  PGPOOL_MAX: z.coerce.number().int().positive().default(10),

  WEBHOOK_SIGNATURE_SECRET: z.string().optional().default(''),

  DEMO_BEARER_TOKEN: z.string().min(1),
  API_BEARER_TOKEN: z.string().min(1),

  DEMO_TAKEDOWN_DATE: z.string().optional(),

  GITHUB_REPO_URL: z.string().optional().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  webhookSignatureEnabled: parsed.data.WEBHOOK_SIGNATURE_SECRET.length > 0,
};

export type Config = typeof config;
