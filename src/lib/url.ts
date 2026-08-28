import { ApiError } from "./errors";

export function extractPublicId(input: string): string {
  const raw = input.trim();
  if (!raw) throw new ApiError("BAD_REQUEST", "url is required");

  if (!raw.includes("/") && !raw.includes(".")) {
    return decodeVanity(raw);
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new ApiError("BAD_REQUEST", `Could not parse "${input}" as a URL`);
  }

  if (!/(^|\.)linkedin\.com$/i.test(parsed.hostname)) {
    throw new ApiError("BAD_REQUEST", "Only linkedin.com profile URLs are supported");
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const inIndex = segments.findIndex((s) => s.toLowerCase() === "in");

  if (inIndex === -1 || !segments[inIndex + 1]) {
    if (segments[0] === "company" || segments[0] === "school") {
      throw new ApiError("BAD_REQUEST", "Company and school pages are not supported, only /in/ profiles");
    }
    throw new ApiError("BAD_REQUEST", "URL does not look like a profile URL (expected /in/<name>)");
  }

  return decodeVanity(segments[inIndex + 1]);
}

function decodeVanity(segment: string): string {
  let value = segment;
  try {
    value = decodeURIComponent(segment);
  } catch {
  }
  value = value.trim().toLowerCase();

  if (value.length > 120) {
    throw new ApiError("BAD_REQUEST", "Profile identifier is unreasonably long");
  }
  if (/[\\?#\s]/.test(value)) {
    throw new ApiError("BAD_REQUEST", `"${segment}" is not a valid profile identifier`);
  }
  return value;
}

export function profileUrlFor(publicId: string) {
  return `https://www.linkedin.com/in/${publicId}/`;
}
