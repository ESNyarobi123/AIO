export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export type ApiEnvelope<T> = {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

type ApiErrorOptions = {
  status?: number;
  /** Worth retrying automatically: the server was unreachable or restarting. */
  retryable?: boolean;
};

export class ApiError extends Error {
  readonly status?: number;
  readonly retryable: boolean;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

const TRANSIENT_STATUS = new Set([502, 503, 504]);
const RETRY_DELAYS_MS = [400, 1000];

function readableMessage(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    const parts = value.filter((item): item is string => typeof item === "string");
    if (parts.length > 0) return parts.join(", ");
  }
  return undefined;
}

/**
 * Turn a response body into JSON without ever throwing a raw SyntaxError.
 * Reverse proxies return an empty body when the API is restarting, which used
 * to surface as `Unexpected end of JSON input` in the UI.
 */
function parseJsonBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function errorFromResponse(status: number, text: string): ApiError {
  const payload = parseJsonBody(text) as
    | { error?: { message?: unknown }; message?: unknown }
    | undefined;
  const message =
    readableMessage(payload?.error?.message) ??
    readableMessage(payload?.message) ??
    (typeof payload === "string" ? payload : undefined);

  if (status === 401) {
    return new ApiError(message ?? "Your session expired. Please sign in again.", {
      status,
    });
  }
  if (TRANSIENT_STATUS.has(status)) {
    return new ApiError(
      message ?? "The AIQ server is restarting. Try again in a moment.",
      { status, retryable: true },
    );
  }
  if (status >= 500) {
    return new ApiError(message ?? "The AIQ server hit a problem. Please try again.", {
      status,
    });
  }
  return new ApiError(message ?? `Request failed (${status})`, { status });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const token =
    typeof window === "undefined" ? null : localStorage.getItem("aiq_token");
  const attempts = method === "GET" ? RETRY_DELAYS_MS.length + 1 : 1;
  let lastError: ApiError | undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await request<T>(path, {
        init,
        token,
        method,
      });
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? error
          : new ApiError(
              error instanceof Error && error.message
                ? error.message
                : "Request failed",
            );
      lastError = apiError;
      const canRetry = apiError.retryable && attempt < attempts - 1;
      if (!canRetry) throw apiError;
      await delay(RETRY_DELAYS_MS[attempt] ?? 1000);
    }
  }

  throw lastError ?? new ApiError("Request failed");
}

async function request<T>(
  path: string,
  {
    init,
    token,
    method,
  }: { init?: RequestInit; token: string | null; method: string },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      "Cannot reach the AIQ server. Check your connection and try again.",
      { retryable: true },
    );
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/pdf")) {
    if (!response.ok) throw new ApiError("Could not download the document");
    return (await response.blob()) as T;
  }

  let text = "";
  try {
    text = await response.text();
  } catch {
    throw new ApiError("The connection dropped while loading data.", {
      status: response.status,
      retryable: true,
    });
  }

  if (!response.ok) {
    throw errorFromResponse(response.status, text);
  }

  const payload = parseJsonBody(text) as
    | { data?: T }
    | T
    | undefined;

  if (payload === undefined) {
    if (!text.trim()) return undefined as T;
    throw new ApiError(
      `The server sent an unreadable response (${method} ${path}).`,
      { status: response.status, retryable: method === "GET" },
    );
  }

  return ((payload as { data?: T }).data ?? payload) as T;
}

export function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function mediaUrl(key?: string | null) {
  if (!key) return "";
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  const origin = API_URL.replace(/\/api\/v1$/, "");
  return `${origin}/${key.replace(/^\//, "")}`;
}

export function when(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Dar_es_Salaam",
  }).format(new Date(value));
}
