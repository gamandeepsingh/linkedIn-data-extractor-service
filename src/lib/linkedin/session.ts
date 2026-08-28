import { env } from "../env";
import { ApiError } from "../errors";
import { CookieJar } from "./cookies";
import { getDb } from "../mongo";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const SESSION_COLLECTION = "linkedin_sessions";
const SESSION_KEY = "default";

let cached: { jar: CookieJar; createdAt: number } | null = null;

const MEMORY_TTL_MS = 30 * 60 * 1000;

export function browserHeaders(extra: Record<string, string> = {}) {
  return {
    "user-agent": USER_AGENT,
    "accept-language": "en-US,en;q=0.9",
    "accept-encoding": "gzip, deflate, br",
    ...extra,
  };
}

export async function getSession(forceNew = false): Promise<CookieJar> {
  if (!forceNew && cached && Date.now() - cached.createdAt < MEMORY_TTL_MS) {
    return cached.jar;
  }

  if (!env.email || !env.password) {
    throw new ApiError(
      "NOT_CONFIGURED",
      "No LinkedIn credentials configured. Set LINKEDIN_EMAIL and LINKEDIN_PASSWORD.",
    );
  }

  if (!forceNew) {
    const stored = await loadStoredSession();
    if (stored) {
      cached = { jar: stored, createdAt: Date.now() };
      return stored;
    }
  }

  const jar = await login(env.email, env.password);
  await storeSession(jar);
  cached = { jar, createdAt: Date.now() };
  return jar;
}

export function invalidateSession() {
  cached = null;
}

async function login(email: string, password: string): Promise<CookieJar> {
  const jar = new CookieJar();

  const bootstrap = await fetch("https://www.linkedin.com/uas/authenticate", {
    headers: browserHeaders({ accept: "text/html,application/xhtml+xml" }),
    redirect: "manual",
  });
  jar.absorb(bootstrap);

  const csrf = jar.csrfToken();
  if (!csrf) {
    throw new ApiError("LINKEDIN_AUTH_FAILED", "LinkedIn did not hand out a JSESSIONID on the login bootstrap");
  }

  const body = new URLSearchParams({
    session_key: email,
    session_password: password,
    JSESSIONID: jar.get("JSESSIONID") ?? "",
    loginCsrfParam: csrf,
  });

  const res = await fetch("https://www.linkedin.com/checkpoint/lg/login-submit", {
    method: "POST",
    headers: browserHeaders({
      "content-type": "application/x-www-form-urlencoded",
      cookie: jar.header(),
      origin: "https://www.linkedin.com",
      referer: "https://www.linkedin.com/uas/login",
      "x-requested-with": "XMLHttpRequest",
    }),
    body,
    redirect: "manual",
  });
  jar.absorb(res);

  const location = res.headers.get("location") ?? "";

  if (location.includes("/checkpoint/challenge") || location.includes("/checkpoint/lg/login-submit")) {
    throw new ApiError(
      "LINKEDIN_AUTH_FAILED",
      "LinkedIn threw a security challenge (2FA or email verification), which this login flow cannot answer. Disable 2FA on the account, or confirm the challenge once from a browser and retry.",
    );
  }

  if (!jar.has("li_at")) {
    throw new ApiError("LINKEDIN_AUTH_FAILED", describeLoginFailure(location, res.status));
  }

  return jar;
}

async function loadStoredSession(): Promise<CookieJar | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const doc = await db
      .collection<{ _id: string; cookies: Record<string, string>; updatedAt: Date }>(SESSION_COLLECTION)
      .findOne({ _id: SESSION_KEY });

    if (!doc?.cookies?.li_at) return null;
    return new CookieJar(doc.cookies);
  } catch {
    return null;
  }
}

async function storeSession(jar: CookieJar) {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .collection(SESSION_COLLECTION)
      .updateOne(
        { _id: SESSION_KEY as never },
        { $set: { cookies: jar.toObject(), updatedAt: new Date() } },
        { upsert: true },
      );
  } catch {
  }
}

export async function clearStoredSession() {
  invalidateSession();
  const db = await getDb();
  if (!db) return;
  try {
    await db.collection(SESSION_COLLECTION).deleteOne({ _id: SESSION_KEY as never });
  } catch {
  }
}

function describeLoginFailure(location: string, status: number) {
  const errorKey = location.match(/[?&]errorKey=([^&]+)/)?.[1];

  switch (errorKey) {
    case "wrong_password":
    case "bad_password":
      return "LinkedIn rejected the password for this account.";
    case "user_not_found":
      return "LinkedIn does not recognise that email address.";
    case "too_many_attempts":
      return "Too many login attempts. LinkedIn has temporarily locked out this account - wait before retrying.";
    case "unexpected_error":
      return "LinkedIn refused the login with a generic error, which is what it returns when it flags the request as automated rather than when the password is wrong. Server-side login is blocked for this account; it usually needs a browser login from the same network first.";
    default:
      return errorKey
        ? `LinkedIn refused the login (errorKey=${errorKey}).`
        : `Login did not return a session cookie (HTTP ${status}). Credentials may be wrong or the account is flagged.`;
  }
}
