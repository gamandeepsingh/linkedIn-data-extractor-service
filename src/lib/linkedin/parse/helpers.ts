import type { DatePart, DateRange, ProfileImage } from "@/types/profile";

type Any = Record<string, any>;

export function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function int(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[,+]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function unwrapUnion<T = Any>(value: unknown, typeHint?: string): T | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Any;
  if (typeHint && obj[typeHint]) return obj[typeHint] as T;

  const keys = Object.keys(obj);
  if (keys.length === 1 && keys[0].includes(".")) return obj[keys[0]] as T;
  return obj as T;
}

export function parseVectorImage(input: unknown): ProfileImage | null {
  const image = unwrapUnion<Any>(input, "com.linkedin.common.VectorImage");
  if (!image) return null;

  const vector: Any | null = image.rootUrl
    ? image
    : image.vectorImage
      ? unwrapUnion<Any>(image.vectorImage, "com.linkedin.common.VectorImage")
      : null;

  if (!vector?.rootUrl || !Array.isArray(vector.artifacts)) return null;

  const variants = vector.artifacts
    .map((artifact: Any) => {
      const segment = str(artifact.fileIdentifyingUrlPathSegment);
      if (!segment) return null;
      return {
        url: `${vector.rootUrl}${segment}`,
        width: int(artifact.width),
        height: int(artifact.height),
      };
    })
    .filter(Boolean) as ProfileImage["variants"];

  if (!variants.length) return null;

  const largest = variants.reduce((best, current) =>
    (current.width ?? 0) > (best.width ?? 0) ? current : best,
  );

  return { url: largest.url, variants };
}

export function parseDatePart(input: unknown): DatePart | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Any;
  const year = int(obj.year);
  const month = int(obj.month);
  if (year === null && month === null) return null;
  return { month, year };
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDatePart(part: DatePart | null): string | null {
  if (!part) return null;
  if (part.year === null) return part.month ? MONTHS[part.month - 1] ?? null : null;
  if (part.month === null) return String(part.year);
  return `${MONTHS[part.month - 1] ?? part.month} ${part.year}`;
}

export function parseDateRange(input: unknown): DateRange {
  const empty: DateRange = { start: null, end: null, text: null, isCurrent: false };
  if (!input || typeof input !== "object") return empty;

  const obj = input as Any;
  const start = parseDatePart(obj.startDate ?? obj.start);
  const end = parseDatePart(obj.endDate ?? obj.end);

  if (!start && !end) return empty;

  const isCurrent = !end;
  const startText = formatDatePart(start);
  const endText = formatDatePart(end) ?? (start ? "Present" : null);
  const text = startText && endText ? `${startText} - ${endText}` : startText ?? endText;

  return { start, end, text, isCurrent };
}

export function describeDuration(range: DateRange): string | null {
  if (!range.start?.year) return null;

  const startMonths = range.start.year * 12 + (range.start.month ?? 1) - 1;
  const endDate = range.end?.year
    ? { year: range.end.year, month: range.end.month ?? 12 }
    : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  const endMonths = endDate.year * 12 + endDate.month - 1;

  const total = endMonths - startMonths + 1;
  if (total <= 0) return null;

  const years = Math.floor(total / 12);
  const months = total % 12;

  const bits: string[] = [];
  if (years) bits.push(`${years} yr${years === 1 ? "" : "s"}`);
  if (months) bits.push(`${months} mo${months === 1 ? "" : "s"}`);
  return bits.join(" ") || null;
}

export function elementsOf(view: unknown): Any[] {
  if (!view || typeof view !== "object") return [];
  const obj = view as Any;
  if (Array.isArray(obj.elements)) return obj.elements;
  if (Array.isArray(obj)) return obj;
  return [];
}

export function companyUrlFromUrn(urn: string | null | undefined, universalName?: string | null) {
  if (universalName) return `https://www.linkedin.com/company/${universalName}/`;
  if (!urn) return null;
  const id = urn.split(":").pop();
  return id ? `https://www.linkedin.com/company/${id}/` : null;
}

export function schoolUrlFromUrn(urn: string | null | undefined, universalName?: string | null) {
  if (universalName) return `https://www.linkedin.com/school/${universalName}/`;
  if (!urn) return null;
  const id = urn.split(":").pop();
  return id ? `https://www.linkedin.com/school/${id}/` : null;
}

export function urnId(urn: string | null | undefined) {
  if (!urn) return null;
  return urn.split(":").pop() ?? null;
}
