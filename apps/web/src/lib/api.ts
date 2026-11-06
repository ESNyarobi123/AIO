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

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token =
    typeof window === "undefined" ? null : localStorage.getItem("aiq_token");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/pdf")) {
    if (!response.ok) throw new ApiError("Could not download the document");
    return (await response.blob()) as T;
  }

  const payload = (await response.json()) as {
    data?: T;
    error?: { message?: string | string[] };
  };

  if (!response.ok) {
    const message = payload.error?.message;
    throw new ApiError(
      Array.isArray(message) ? message.join(", ") : message || "Request failed",
    );
  }

  return (payload.data ?? payload) as T;
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
