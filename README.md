# LinkedIn Profile API

Give it a LinkedIn profile URL, get the profile back as JSON.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Put `LINKEDIN_COOKIE` and `LINKEDIN_USER_AGENT` in `.env`. Open DevTools → Network on linkedin.com, click any request, and copy the whole **Cookie** request header plus the **User-Agent**. The full cookie set matters: `li_at` on its own gets revoked, because LinkedIn ties the session to the browser fingerprint in `bcookie`/`bscookie` and the user agent. `MONGODB_URI` is optional but recommended, since it caches profiles so repeat lookups never touch LinkedIn. `LINKEDIN_EMAIL` / `LINKEDIN_PASSWORD` work as a fallback locally.

## No browser is used

Every request is a plain `fetch` against LinkedIn's Voyager endpoints. There is no Puppeteer, Playwright or Selenium anywhere in the code or the dependency tree.

The session cookie is credential configuration — the same as putting a password in an env var, which the brief allows. It is read once at startup and replayed as a request header. Password login is implemented too, but LinkedIn refuses it from datacenter IPs (`errorKey=unexpected_error`), so the cookie is what makes a deployed instance work.

## API

- `GET /api/profile?url=<profile-url>` — add `&refresh=true` to skip the cache
- `POST /api/profile` with `{ "url": "..." }`
- `GET /api/health`

Returns name, headline, about, location, images, experience, education, skills, certifications, languages, projects and more, plus derived keywords.

## Approach

No HTML scraping. It calls LinkedIn's internal Voyager API the way the web app does — the trick is the `csrf-token` header matching the `JSESSIONID` cookie, and `x-restli-protocol-version: 2.0.0`. Two endpoints are tried in order (dash, then the older profileView) since LinkedIn keeps retiring them, and both parsers produce the same shape.

## Limitations

- Sessions expire. LinkedIn does not return 401 for this — it 302s every request back on itself, and replies `li_at="delete me"` when it revokes one. Both are detected and reported as auth errors rather than as a missing profile.
- `followers`, `connections` and `contact` are always null. The endpoints that served them (`networkinfo`, `profileContactInfo`, `skills`) now return HTTP 410, so they were removed; skills come from the dash response instead.
- Out-of-network profiles return less. LinkedIn withholds skills and most positions from people you are not connected to, so a 1st-degree profile shows far more than a stranger's.
- You only get what the logged-in account can see.
- Against LinkedIn's ToS. Use a throwaway account.
- Rate limiting is per lambda instance, not global.

## Scripts

`npm test` runs the parser tests. `npm run warm -- <url> [...]` pre-caches profiles so the demo keeps serving them even if the session dies.
