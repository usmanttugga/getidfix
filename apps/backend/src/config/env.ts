import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT:     z.string().default('3001').transform(Number),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL:    z.string().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  PAYSTACK_SECRET_KEY: z.string().default(''),

  FLW_SECRET_KEY: z.string().default(''),
  FLW_PUBLIC_KEY: z.string().default(''),
  FLW_VIRTUAL_ACCOUNT_BANK: z.string().default('palmpay'),

  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),

  FRONTEND_URL: z.string().default('http://localhost:3000'),

  VERIFYME_CLIENT_ID: z.string().default(''),
  VERIFYME_API_KEY:   z.string().min(1, 'VERIFYME_API_KEY is required'),
  LUMIID_API_KEY:   z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const errors = result.error.errors.map((e) => `  • ${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(`[Config] Environment variable validation failed:\n${errors}`);
    }
    _env = result.data;
  }
  return _env;
}

export function resetEnvCache(): void {
  _env = null;
}

export default getEnv;
