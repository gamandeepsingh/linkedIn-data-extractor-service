function optional(key: string): string | undefined {
  const v = process.env[key];
  if (!v || v.trim() === "") return undefined;
  return v.trim();
}

function num(key: string, fallback: number): number {
  const raw = optional(key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  email: optional("LINKEDIN_EMAIL"),
  password: optional("LINKEDIN_PASSWORD"),

  graphqlQueryId: optional("LINKEDIN_GRAPHQL_QUERY_ID"),

  mongoUri: optional("MONGODB_URI"),
  mongoDb: optional("MONGODB_DB") ?? "tross_linkedin",
  cacheTtlSeconds: num("CACHE_TTL_SECONDS", 60 * 60 * 24),

  apiKey: optional("API_KEY"),
  rateLimitPerMinute: num("RATE_LIMIT_PER_MINUTE", 20),
};

export function hasAnyCredentials() {
  return Boolean(env.email && env.password);
}
