export function proxyImage(url: string | null | undefined) {
  if (!url) return undefined;
  if (!/^https:\/\/([a-z0-9-]+\.)*licdn\.com\//i.test(url)) return url;
  return `/api/image?u=${encodeURIComponent(url)}`;
}
