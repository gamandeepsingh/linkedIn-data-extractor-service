export class CookieJar {
  private jar = new Map<string, string>();

  constructor(initial?: Record<string, string>) {
    if (initial) {
      for (const [k, v] of Object.entries(initial)) this.set(k, v);
    }
  }

  set(name: string, value: string) {
    this.jar.set(name, value);
  }

  get(name: string) {
    return this.jar.get(name);
  }

  has(name: string) {
    return this.jar.has(name);
  }

  absorb(res: Response) {
    const raw =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : splitSetCookie(res.headers.get("set-cookie"));

    for (const line of raw) {
      const pair = line.split(";")[0];
      const idx = pair.indexOf("=");
      if (idx <= 0) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (!name) continue;
      if (value === '"delete me"' || value === "") {
        this.jar.delete(name);
        continue;
      }
      this.jar.set(name, value);
    }
  }

  header() {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  toObject(): Record<string, string> {
    return Object.fromEntries(this.jar);
  }

  csrfToken(): string | undefined {
    const raw = this.jar.get("JSESSIONID");
    if (!raw) return undefined;
    return raw.replace(/"/g, "");
  }
}

function splitSetCookie(header: string | null): string[] {
  if (!header) return [];
  return header.split(/,(?=[^;,]*?=)/g);
}

