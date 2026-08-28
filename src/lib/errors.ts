export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "LINKEDIN_AUTH_FAILED"
  | "PROFILE_NOT_FOUND"
  | "PROFILE_PRIVATE"
  | "LINKEDIN_BLOCKED"
  | "UPSTREAM_ERROR"
  | "INTERNAL";

const statusByCode: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  RATE_LIMITED: 429,
  NOT_CONFIGURED: 500,
  LINKEDIN_AUTH_FAILED: 502,
  PROFILE_NOT_FOUND: 404,
  PROFILE_PRIVATE: 403,
  LINKEDIN_BLOCKED: 429,
  UPSTREAM_ERROR: 502,
  INTERNAL: 500,
};

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = statusByCode[code];
    this.details = details;
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof Error) return new ApiError("INTERNAL", err.message);
  return new ApiError("INTERNAL", "Unknown error");
}
