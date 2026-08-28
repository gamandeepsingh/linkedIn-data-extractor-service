import { ApiError } from "../errors";
import type { CookieJar } from "./cookies";
import { browserHeaders, clearStoredSession, getSession } from "./session";

const API_BASE = "https://www.linkedin.com/voyager/api";

const ACCEPT_NORMALIZED = "application/vnd.linkedin.normalized+json+2.1";

export interface VoyagerOptions {
  path: string;
  query?: Record<string, string | number | undefined>;
  rawQuery?: string;
  normalized?: boolean;
  retryOnAuth?: boolean;
}

export interface VoyagerResponse<T = unknown> {
  status: number;
  body: T;
}

export async function voyager<T = unknown>(opts: VoyagerOptions): Promise<VoyagerResponse<T>> {
  return request<T>(opts, opts.retryOnAuth ?? true);
}

async function request<T>(opts: VoyagerOptions, allowRetry: boolean): Promise<VoyagerResponse<T>> {
  const jar = await getSession();
  const csrf = jar.csrfToken();

  if (!csrf) {
    throw new ApiError("LINKEDIN_AUTH_FAILED", "Session has no JSESSIONID, cannot build a CSRF token");
  }

  const url = buildUrl(opts);

  let res: Response;
  try {
    res = await follow(url, jar, {
      headers: browserHeaders({
        accept: opts.normalized === false ? "application/json" : ACCEPT_NORMALIZED,
        "csrf-token": csrf,
        "x-restli-protocol-version": "2.0.0",
        "x-li-lang": "en_US",
        "x-li-track": JSON.stringify({
          clientVersion: "1.13.30",
          mpVersion: "1.13.30",
          osName: "web",
          timezoneOffset: 0,
          deviceFormFactor: "DESKTOP",
          mpName: "voyager-web",
        }),
        referer: "https://www.linkedin.com/feed/",
      }),
    });
  } catch (err) {
    if (err instanceof ApiError && err.code === "LINKEDIN_AUTH_FAILED" && allowRetry) {
      await clearStoredSession();
      return request<T>(opts, false);
    }
    throw err;
  }

  if (res.status === 401 || res.status === 403) {
    if (allowRetry) {
      await clearStoredSession();
      return request<T>(opts, false);
    }
    throw new ApiError(
      "LINKEDIN_AUTH_FAILED",
      `LinkedIn rejected the session (HTTP ${res.status}). Logging in again did not help - the credentials may be wrong or the account is flagged.`,
    );
  }

  if (res.status === 429) {
    throw new ApiError(
      "LINKEDIN_BLOCKED",
      "LinkedIn is rate limiting this account. Back off for a while before retrying.",
    );
  }

  if (res.url.includes("/authwall") || res.url.includes("/uas/login")) {
    throw new ApiError("LINKEDIN_AUTH_FAILED", "Request was bounced to the LinkedIn auth wall");
  }

  const text = await res.text();

  if (!text) {
    return { status: res.status, body: {} as T };
  }

  let body: T;
  try {
    body = JSON.parse(text) as T;
  } catch {
    if (text.trimStart().startsWith("<")) {
      throw new ApiError(
        "LINKEDIN_BLOCKED",
        "LinkedIn returned an HTML page instead of JSON - the account is probably challenged or blocked.",
      );
    }
    throw new ApiError("UPSTREAM_ERROR", `Could not parse Voyager response (HTTP ${res.status})`);
  }

  return { status: res.status, body };
}

const MAX_REDIRECTS = 5;

async function follow(url: string, jar: CookieJar, init: RequestInit): Promise<Response> {
  let current = url;
  let selfRedirects = 0;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const headers = { ...(init.headers as Record<string, string>), cookie: jar.header() };
    const res = await fetch(current, { ...init, headers, redirect: "manual" });

    jar.absorb(res);

    if (res.status < 300 || res.status >= 400) return res;

    const location = res.headers.get("location");
    if (!location) return res;

    const next = new URL(location, current).toString();

    if (next.includes("/authwall") || next.includes("/uas/login") || next.includes("/checkpoint/")) {
      throw new ApiError("LINKEDIN_AUTH_FAILED", "Request was bounced to the LinkedIn auth wall");
    }

    if (next === current) selfRedirects++;
    current = next;
  }

  if (selfRedirects >= MAX_REDIRECTS) {
    throw new ApiError(
      "LINKEDIN_AUTH_FAILED",
      "LinkedIn is redirecting every request back on itself, which is what it does when the session is no longer valid.",
    );
  }

  throw new ApiError("UPSTREAM_ERROR", `Too many redirects for ${new URL(url).pathname}.`);
}

function buildUrl(opts: VoyagerOptions) {
  const base = `${API_BASE}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;

  const parts: string[] = [];
  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value === undefined) continue;
      parts.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  }
  if (opts.rawQuery) parts.push(opts.rawQuery);

  return parts.length ? `${base}?${parts.join("&")}` : base;
}
