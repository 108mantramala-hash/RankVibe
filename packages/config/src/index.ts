// Shared environment variable helpers
// Use this in both web and worker to validate env vars at startup

type EnvKey =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  | 'SUPABASE_SERVICE_ROLE_KEY'
  | 'DATABASE_URL'
  | 'APIFY_API_TOKEN'
  | 'OPENAI_API_KEY'
  | 'REDIS_URL'
  | 'NEXT_PUBLIC_APP_URL';

export function getEnv(key: EnvKey, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnv(key: string): string | undefined {
  return process.env[key] || undefined;
}
