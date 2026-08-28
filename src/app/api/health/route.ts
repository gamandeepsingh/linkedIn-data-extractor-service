import { NextResponse } from "next/server";
import { env, hasAnyCredentials } from "@/lib/env";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let mongo: "connected" | "unreachable" | "not-configured" = "not-configured";

  if (env.mongoUri) {
    const db = await getDb();
    mongo = db ? "connected" : "unreachable";
  }

  return NextResponse.json({
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
    linkedin: {
      configured: hasAnyCredentials(),
      mode: env.email ? "credentials" : "none",
    },
    mongo,
    cacheTtlSeconds: env.cacheTtlSeconds,
    apiKeyRequired: Boolean(env.apiKey),
  });
}
