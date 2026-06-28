/**
 * providers/http/client.ts
 * 轻量 HTTP 客户端 —— 供 ezplm / local-api Provider 共用。
 * 负责：基址拼接、鉴权头注入、超时、统一错误、JSON 解析。
 *
 * 不依赖任何第三方库（用 fetch + AbortController）。
 */

export interface HttpClientOptions {
  baseUrl: string;
  /** 返回鉴权头（如 { Authorization: 'Bearer xxx' }）。每次请求调用，便于刷新令牌。 */
  getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  timeoutMs?: number;
  /** 默认请求头 */
  defaultHeaders?: Record<string, string>;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public url: string,
    public body?: unknown
  ) {
    super(`HTTP ${status} ${statusText} @ ${url}`);
    this.name = 'HttpError';
  }
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async get<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', path, undefined, query);
  }
  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }
  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = this.buildUrl(path, query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? 15000);

    try {
      const authHeaders = this.opts.getAuthHeaders ? await this.opts.getAuthHeaders() : {};
      const res = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...this.opts.defaultHeaders,
          ...authHeaders,
        },
        body: body != null ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        let errBody: unknown;
        try { errBody = await res.json(); } catch { errBody = await res.text().catch(() => undefined); }
        throw new HttpError(res.status, res.statusText, url, errBody);
      }

      if (res.status === 204) return undefined as T;
      const text = await res.text();
      return text ? (JSON.parse(text) as T) : (undefined as T);
    } catch (e) {
      if (e instanceof HttpError) throw e;
      if ((e as Error).name === 'AbortError') throw new HttpError(0, 'Timeout', url);
      throw new HttpError(0, (e as Error).message || 'Network Error', url);
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const base = this.opts.baseUrl.replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    const qs = query
      ? '?' + Object.entries(query)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return `${base}${p}${qs}`;
  }
}
