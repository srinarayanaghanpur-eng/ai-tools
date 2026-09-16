/**
 * Centralized backend API client.
 * - Base URL comes ONLY from NEXT_PUBLIC_API_URL (never hardcoded prod URLs).
 * - No secrets here: auth uses httpOnly refresh cookie + in-memory/short-lived access token.
 * - Backend envelope: { success, data } / { success:false, error:{ code, message } }.
 */

export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export type ApiError = {
  code: string;
  message: string;
  status: number;
};

export class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const TOKEN_KEY = "tv_access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const code = json?.error?.code ?? (res.status === 429 ? "RATE_LIMITED" : "INTERNAL_ERROR");
    const message = friendlyMessage(code, json?.error?.message, res.status);
    throw new ApiClientError(code, message, res.status);
  }
  return (json?.data ?? json) as T;
}

/** Map backend codes to polished UI copy. Never surface stack traces. */
export function friendlyMessage(code: string, serverMessage?: string, status?: number): string {
  switch (code) {
    case "INVALID_FILE":
      return serverMessage && serverMessage.length < 140 ? serverMessage : "That file couldn't be used. Please try a different file.";
    case "FILE_TOO_LARGE":
      return "File too large. Please choose a smaller file or compress it first.";
    case "UNSUPPORTED_FORMAT":
      return "Unsupported file format for this tool.";
    case "PROCESSING_FAILED":
      return serverMessage && serverMessage.length < 200 ? serverMessage : "Processing failed. Please try again.";
    case "JOB_NOT_FOUND":
      return "Job not found. It may have expired.";
    case "RATE_LIMITED":
      return "Too many requests. Please wait a moment and try again.";
    case "UNAUTHORIZED":
      return "Please sign in to continue.";
    case "FORBIDDEN":
      return "You don't have access to this.";
    case "AI_PROVIDER_ERROR":
      return "AI service is temporarily unavailable. Please try again later.";
    case "STORAGE_ERROR":
      return "Storage error. Please try again.";
    case "VALIDATION_ERROR":
      return serverMessage && serverMessage.length < 160 ? serverMessage : "Please check your input and try again.";
    case "NOT_FOUND":
      return "Not found.";
    default:
      if (status === 0) return "Connection lost. Check your network and the backend status.";
      return serverMessage && serverMessage.length < 160 ? serverMessage : "Something went wrong. Please try again.";
  }
}

type RequestOptions = {
  token?: string | null;
  signal?: AbortSignal;
};

function headers(token?: string | null, extra?: HeadersInit): HeadersInit {
  const t = token === undefined ? getToken() : token;
  return {
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra,
  };
}

export const api = {
  base: API_BASE,

  async get<T>(path: string, opts?: RequestOptions): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        headers: headers(opts?.token),
        credentials: "include",
        signal: opts?.signal,
      });
    } catch {
      throw new ApiClientError("CONNECTION_ERROR", friendlyMessage("CONNECTION_ERROR", undefined, 0), 0);
    }
    return parse<T>(res);
  },

  async postJson<T>(path: string, body: unknown, opts?: RequestOptions): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: headers(opts?.token, { "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(body ?? {}),
        signal: opts?.signal,
      });
    } catch {
      throw new ApiClientError("CONNECTION_ERROR", friendlyMessage("CONNECTION_ERROR", undefined, 0), 0);
    }
    return parse<T>(res);
  },

  async patchJson<T>(path: string, body: unknown, opts?: RequestOptions): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: "PATCH",
        headers: headers(opts?.token, { "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(body ?? {}),
        signal: opts?.signal,
      });
    } catch {
      throw new ApiClientError("CONNECTION_ERROR", friendlyMessage("CONNECTION_ERROR", undefined, 0), 0);
    }
    return parse<T>(res);
  },

  async delete<T>(path: string, opts?: RequestOptions): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: "DELETE",
        headers: headers(opts?.token),
        credentials: "include",
        signal: opts?.signal,
      });
    } catch {
      throw new ApiClientError("CONNECTION_ERROR", friendlyMessage("CONNECTION_ERROR", undefined, 0), 0);
    }
    return parse<T>(res);
  },

  /** Multipart upload for file tools. Reports upload progress via XHR-less fetch (indeterminate) — caller animates. */
  async postFiles<T>(
    path: string,
    files: File[],
    fields?: Record<string, string>,
    opts?: RequestOptions & { onUploadProgress?: (pct: number) => void }
  ): Promise<T> {
    const form = new FormData();
    for (const f of files) form.append("files", f, f.name);
    if (fields) {
      for (const [k, v] of Object.entries(fields)) form.append(k, v);
    }
    opts?.onUploadProgress?.(30);
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: headers(opts?.token),
        credentials: "include",
        body: form,
        signal: opts?.signal,
      });
    } catch {
      throw new ApiClientError("CONNECTION_ERROR", friendlyMessage("CONNECTION_ERROR", undefined, 0), 0);
    }
    opts?.onUploadProgress?.(100);
    return parse<T>(res);
  },

  /** Download output bytes. Returns blob + filename from Content-Disposition. */
  async download(jobId: string, fileId: string, token?: string | null): Promise<{ blob: Blob; filename: string }> {
    const t = token === undefined ? getToken() : token;
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/jobs/${jobId}/download?fileId=${encodeURIComponent(fileId)}`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
        credentials: "include",
      });
    } catch {
      throw new ApiClientError("CONNECTION_ERROR", friendlyMessage("CONNECTION_ERROR", undefined, 0), 0);
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      let code = "INTERNAL_ERROR";
      try {
        code = JSON.parse(txt)?.error?.code ?? code;
      } catch { /* ignore */ }
      throw new ApiClientError(code, friendlyMessage(code), res.status);
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") ?? "";
    const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/);
    const filename = decodeURIComponent(m?.[1] ?? m?.[2] ?? "download");
    return { blob, filename };
  },
};

// ---- Typed endpoints ----

export type BackendTool = {
  id: string;
  slug: string;
  name: string;
  category: string;
  category_slug?: string;
  description: string;
  inputType?: string;
  input_type?: string;
  acceptedFormats?: string[];
  accepted_formats?: string[];
  outputFormat?: string;
  output_format?: string;
  status: string;
  limits?: { maxFiles: number; maxFileMb: number };
  max_file_mb?: number;
  max_files?: number;
  paramsSchema?: Record<string, unknown>;
};

export type Job = {
  id: string;
  user_id?: string | null;
  tool_id: string;
  tool_slug?: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  progress: number;
  input_files: any[];
  output_files: Array<{
    fileId: string;
    filename: string;
    mime?: string;
    size?: number;
    downloadUrl?: string;
    downloadToken?: string;
  }>;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
};

export const ToolsAPI = {
  list(signal?: AbortSignal): Promise<{ tools: BackendTool[]; categories: any[] }> {
    return api.get("/api/tools", { signal });
  },
  get(slug: string): Promise<{ tool: BackendTool }> {
    return api.get(`/api/tools/${encodeURIComponent(slug)}`);
  },
  processJson(toolId: string, body: Record<string, unknown>): Promise<{ jobId: string; status: string; pollUrl?: string }> {
    return api.postJson(`/api/tools/${encodeURIComponent(toolId)}/process`, body);
  },
  processFiles(
    toolId: string,
    files: File[],
    fields?: Record<string, string>,
    onUploadProgress?: (pct: number) => void
  ): Promise<{ jobId: string; status: string; pollUrl?: string }> {
    return api.postFiles(`/api/tools/${encodeURIComponent(toolId)}/process`, files, fields, { onUploadProgress });
  },
};

export const JobsAPI = {
  get(jobId: string): Promise<{ job: Job }> {
    return api.get(`/api/jobs/${encodeURIComponent(jobId)}`);
  },
  cancel(jobId: string): Promise<{ job: Job }> {
    return api.postJson(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, {});
  },
  async poll(jobId: string, onUpdate?: (job: Job) => void, signal?: AbortSignal): Promise<Job> {
    for (;;) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const { job } = await JobsAPI.get(jobId);
      onUpdate?.(job);
      if (job.status === "COMPLETED" || job.status === "FAILED" || job.status === "CANCELLED") return job;
      await new Promise((r) => setTimeout(r, 1200));
    }
  },
};

export const AuthAPI = {
  register(body: { email: string; password: string; name?: string }) {
    return api.postJson<{ user: any }>("/api/auth/register", body);
  },
  login(body: { email: string; password: string }) {
    return api.postJson<{ user: any; accessToken: string }>("/api/auth/login", body);
  },
  logout() {
    return api.postJson("/api/auth/logout", {});
  },
  me(token?: string | null) {
    return api.get<{ user: any }>("/api/auth/me", { token });
  },
  forgotPassword(email: string) {
    return api.postJson<{ message: string; resetToken?: string }>("/api/auth/forgot-password", { email });
  },
  resetPassword(token: string, password: string) {
    return api.postJson("/api/auth/reset-password", { token, password });
  },
};

export const UserAPI = {
  jobs(params?: { page?: number; limit?: number; status?: string }) {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.status) q.set("status", params.status);
    return api.get<{ jobs?: any[] } | any[]>(`/api/user/jobs?${q.toString()}`);
  },
  files(params?: { page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    return api.get(`/api/user/files?${q.toString()}`);
  },
  usage() {
    return api.get<{ usage: any }>("/api/user/usage");
  },
};

export const BlogAPI = {
  list(params?: { page?: number; limit?: number }): Promise<{ posts?: any[] } & any> {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    return api.get(`/api/blog?${q.toString()}`);
  },
  get(slug: string): Promise<{ post: any }> {
    return api.get(`/api/blog/${encodeURIComponent(slug)}`);
  },
};
