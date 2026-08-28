import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, toApiError } from "@/lib/errors";
import { env } from "@/lib/env";
import { extractPublicId } from "@/lib/url";
import { fetchProfile } from "@/lib/linkedin/fetch-profile";
import { readCache, writeCache } from "@/lib/cache";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import type { ProfileResponse } from "@/types/profile";
import { extractKeywords } from "@/lib/keywords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().min(1, "url is required"),
  refresh: z.boolean().optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return handle(req, {
    url: searchParams.get("url") ?? searchParams.get("profileUrl") ?? "",
    refresh: searchParams.get("refresh") === "true",
  });
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail(new ApiError("BAD_REQUEST", "Request body must be JSON"));
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail(new ApiError("BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid body"));
  }
  return handle(req, parsed.data);
}

async function handle(req: Request, input: { url: string; refresh?: boolean }) {
  const startedAt = Date.now();

  try {
    if (env.apiKey) {
      const provided = req.headers.get("x-api-key") ?? bearer(req);
      if (provided !== env.apiKey) {
        throw new ApiError("UNAUTHORIZED", "Missing or invalid API key");
      }
    }

    const limit = checkRateLimit(clientKey(req));
    if (!limit.ok) {
      const err = new ApiError("RATE_LIMITED", "Too many requests, slow down");
      return fail(err, { "retry-after": String(limit.retryAfter ?? 60) });
    }

    if (!input.url) {
      throw new ApiError("BAD_REQUEST", "Pass a LinkedIn profile URL as `url`");
    }

    const publicId = extractPublicId(input.url);

    if (!input.refresh) {
      const cached = await readCache(publicId);
      if (cached) {
        const payload: ProfileResponse = {
          success: true,
          cached: true,
          fetchedAt: cached.fetchedAt.toISOString(),
          source: cached.source,
          keywords: extractKeywords(cached.profile),
          meta: { durationMs: Date.now() - startedAt, warnings: [] },
          profile: cached.profile,
        };
        return NextResponse.json(payload, {
          headers: { "x-cache": "HIT", "x-ratelimit-remaining": String(limit.remaining) },
        });
      }
    }

    const { profile, source, warnings } = await fetchProfile(publicId);
    await writeCache(publicId, profile, source);

    const payload: ProfileResponse = {
      success: true,
      cached: false,
      fetchedAt: new Date().toISOString(),
      source,
      keywords: extractKeywords(profile),
      meta: { durationMs: Date.now() - startedAt, warnings },
      profile,
    };

    return NextResponse.json(payload, {
      headers: { "x-cache": "MISS", "x-ratelimit-remaining": String(limit.remaining) },
    });
  } catch (err) {
    const apiError = toApiError(err);
    if (apiError.status >= 500) {
      console.error("[api/profile]", apiError.code, apiError.message, apiError.details ?? "");
    }
    return fail(apiError);
  }
}

function bearer(req: Request) {
  const header = req.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
}

function fail(err: ApiError, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(
    {
      success: false,
      error: { code: err.code, message: err.message, details: err.details ?? undefined },
    },
    { status: err.status, headers: extraHeaders },
  );
}
