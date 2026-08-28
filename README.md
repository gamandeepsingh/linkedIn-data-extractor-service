# LinkedIn Profile API

Give it a LinkedIn profile URL, get the profile back as JSON.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Put `LINKEDIN_EMAIL` and `LINKEDIN_PASSWORD` in `.env`. The server logs in itself on first use and stores the session in Mongo, so set `MONGODB_URI` too — otherwise it logs in again on every cold start, which is what gets accounts flagged.

## API

- `GET /api/profile?url=<profile-url>` — add `&refresh=true` to skip the cache
- `POST /api/profile` with `{ "url": "..." }`
- `GET /api/health`

Returns name, headline, about, location, images, experience, education, skills, certifications, languages, projects and more, plus derived keywords.

## Approach

No browser or HTML scraping. It calls LinkedIn's internal Voyager API the way the web app does — the trick is the `csrf-token` header matching the `JSESSIONID` cookie, and `x-restli-protocol-version: 2.0.0`. Two endpoints are tried in order (dash, then the older profileView) since LinkedIn keeps retiring them, and both parsers produce the same shape.
