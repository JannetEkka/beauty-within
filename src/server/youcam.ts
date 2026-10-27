// Minimal YouCam API client (docs.perfectcorp.com, 10-27). Runs on Cloudflare Workers and Node 18+.
// Flow for every AI feature: POST /s2s/v2.0/file -> PUT bytes to the pre-signed URL -> POST task -> poll GET task/{id}.

export type TaskKind =
  | 'skin-analysis'
  | 'skin-tone-analysis'
  | 'face-attr-analysis'
  | 'makeup-vto'
  | 'hair-color'
  | 'hair-transfer'
  | 'cloth-v4';

/** API version prefix per task; the hairstyle transfer we use is v2.1. */
const TASK_VERSION: Partial<Record<TaskKind, string>> = { 'hair-transfer': 'v2.1' };
const taskPath = (kind: TaskKind) => `/s2s/${TASK_VERSION[kind] ?? 'v2.0'}/task/${kind}`;

export interface YouCamOptions {
  apiKey: string;
  /** e.g. https://yce-api-01.makeupar.com. Set YOUCAM_API_BASE for the India-region host if it differs. */
  baseUrl: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export class YouCamError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** Units each call costs, from the docs' Unit Consumption tables. Charged only when a task succeeds. */
export const UNIT_COST: Record<TaskKind, number> = {
  'skin-analysis': 14, // SD, 9–12 concerns
  'skin-tone-analysis': 20,
  'face-attr-analysis': 10, // 1–5 features
  'makeup-vto': 1,
  'hair-color': 1,
  'hair-transfer': 2,
  'cloth-v4': 2,
};

export class YouCam {
  private f: typeof fetch;
  private sleep: (ms: number) => Promise<void>;

  constructor(private opts: YouCamOptions) {
    this.f = opts.fetch ?? fetch.bind(globalThis);
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.f(`${this.opts.baseUrl.replace(/\/$/, '')}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new YouCamError(`YouCam ${path}: non-JSON reply (${res.status})`, res.status);
    }
    if (!res.ok || (typeof json.status === 'number' && json.status >= 400)) {
      throw new YouCamError(
        `YouCam ${path}: ${String(json.error ?? res.statusText)}`,
        res.status,
        json.error_code as string | undefined,
      );
    }
    return json as T;
  }

  /** Remaining units across all batches. Free to call. */
  async unitsLeft(): Promise<number> {
    const j = await this.call<{ results?: { amount_dec?: number; amount?: number }[] }>('GET', '/s2s/v1.0/client/credit');
    return (j.results ?? []).reduce((s, r) => s + (r.amount_dec ?? r.amount ?? 0), 0);
  }

  /** Registers a file and uploads the bytes. Returns the file_id that tasks take. */
  async upload(bytes: ArrayBuffer, contentType: string, fileName = 'selfie.jpg'): Promise<string> {
    const j = await this.call<{ data?: { files?: FileSlot[] }; files?: FileSlot[] }>('POST', '/s2s/v2.0/file', {
      files: [{ content_type: contentType, file_name: fileName, file_size: bytes.byteLength }],
    });
    const slot = (j.data?.files ?? j.files)?.[0];
    const req = slot?.requests?.[0];
    if (!slot?.file_id || !req?.url) throw new YouCamError('YouCam file API: no upload slot', 500);
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers ?? {})) headers[k] = String(v);
    const put = await this.f(req.url, { method: req.method ?? 'PUT', headers, body: bytes });
    if (!put.ok) throw new YouCamError(`upload to pre-signed URL failed (${put.status})`, put.status);
    return slot.file_id;
  }

  async start(kind: TaskKind, body: Record<string, unknown>): Promise<string> {
    const j = await this.call<{ data?: { task_id?: string } }>('POST', taskPath(kind), body);
    const id = j.data?.task_id;
    if (!id) throw new YouCamError(`YouCam ${kind}: no task_id`, 500);
    return id;
  }

  /** Polls until success or error. Returns the full success body. */
  async wait(kind: TaskKind, taskId: string, { timeoutMs = 60_000, everyMs = 2_000 } = {}): Promise<TaskBody> {
    const until = Date.now() + timeoutMs;
    for (;;) {
      const j = await this.call<TaskBody>('GET', `${taskPath(kind)}/${encodeURIComponent(taskId)}`);
      const st = j.data?.task_status;
      if (st === 'success') return j;
      if (st === 'error') {
        throw new YouCamError(`YouCam ${kind} failed: ${j.data?.error ?? j.data?.failure_reason ?? 'unknown'}`, 422, j.data?.error);
      }
      if (Date.now() > until) throw new YouCamError(`YouCam ${kind}: still running after ${timeoutMs / 1000}s`, 504);
      await this.sleep(everyMs);
    }
  }

  /** Hairstyle templates (GET /s2s/v2.1/task/template/hair-transfer), all pages. */
  async hairTemplates(): Promise<{ id: string; title: string; thumb?: string; category?: string }[]> {
    const out: { id: string; title: string; thumb?: string; category?: string }[] = [];
    let token: string | undefined;
    for (let page = 0; page < 10; page++) {
      const q = `?page_size=50${token ? `&starting_token=${encodeURIComponent(token)}` : ''}`;
      const j = await this.call<{ data?: { templates?: { id: string; title?: string; thumb?: string; category_name?: string }[]; next_token?: string } }>(
        'GET',
        `/s2s/v2.1/task/template/hair-transfer${q}`,
      );
      for (const t of j.data?.templates ?? []) out.push({ id: t.id, title: t.title ?? t.id, thumb: t.thumb, category: t.category_name });
      token = j.data?.next_token;
      if (!token) break;
    }
    return out;
  }

  async run(kind: TaskKind, body: Record<string, unknown>, opts?: { timeoutMs?: number }) {
    return this.wait(kind, await this.start(kind, body), opts);
  }
}

interface FileSlot {
  file_id?: string;
  requests?: { url?: string; method?: string; headers?: Record<string, unknown> }[];
}

export interface TaskBody {
  status?: number;
  data?: {
    task_status?: string;
    results?: unknown;
    error?: string;
    failure_reason?: string;
  };
}

/** The result image URL of a makeup-vto task, whichever shape the reply uses. */
export function resultImageUrl(body: TaskBody): string | undefined {
  const r = body.data?.results as { url?: string; download_url?: string } | { url?: string; download_url?: string }[] | undefined;
  const first = Array.isArray(r) ? r[0] : r;
  return first?.url ?? first?.download_url;
}
