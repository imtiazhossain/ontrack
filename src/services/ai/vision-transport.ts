import { guardedFetch } from '@/services/http/dependency-guard';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

/** Extract assistant text from an OpenAI Responses API body. */
export function openAIResponseText(body: Record<string, unknown>): string | undefined {
  if (typeof body.output_text === 'string') return body.output_text;
  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    if (typeof item !== 'object' || item === null) continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];
    for (const part of content) {
      if (
        typeof part === 'object' &&
        part !== null &&
        typeof (part as Record<string, unknown>).text === 'string'
      ) {
        return (part as Record<string, unknown>).text as string;
      }
    }
  }
  return undefined;
}

export function parseOpenAIJsonResponse(
  body: Record<string, unknown>,
  options: { emptyError?: string; parseError?: string } = {},
): unknown {
  const emptyError = options.emptyError ?? 'INVALID_ANALYSIS';
  const text = openAIResponseText(body);
  if (!text) throw new Error(emptyError);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(options.parseError ?? emptyError);
  }
}

export type OpenAIResponsesOptions = {
  model: string;
  safetyIdentifier: string;
  payload: Record<string, unknown>;
  timeoutMs?: number;
  maxConcurrency?: number;
  /** When set, used instead of `OpenAI request failed (status)`. */
  httpError?: string;
};

/** Authenticated OpenAI Responses API call shared by meal/plant/recipe servers. */
export async function fetchOpenAIResponses(
  options: OpenAIResponsesOptions,
): Promise<Record<string, unknown>> {
  const response = await guardedFetch(
    'openai',
    OPENAI_RESPONSES_URL,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        store: false,
        safety_identifier: options.safetyIdentifier,
        reasoning: { effort: 'low' },
        ...options.payload,
      }),
    },
    {
      timeoutMs: options.timeoutMs ?? 45_000,
      maxConcurrency: options.maxConcurrency ?? 2,
    },
  );
  if (!response.ok) {
    throw new Error(
      options.httpError ?? `OpenAI request failed (${response.status})`,
    );
  }
  return response.json() as Promise<Record<string, unknown>>;
}

function loopbackOllamaBaseUrl(): URL {
  const baseUrl = new URL(process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434');
  if (!LOOPBACK_HOSTS.has(baseUrl.hostname)) {
    throw new Error('OLLAMA_UNAVAILABLE');
  }
  return baseUrl;
}

export type OllamaChatJsonOptions = {
  model: string;
  prompt: string;
  schema: unknown;
  imageDataUrls?: string[];
  /** Append `/no_think` when the prompt does not already include it. */
  appendNoThink?: boolean;
  numPredict?: number;
  numCtx?: number;
  timeoutMs?: number;
  emptyError?: string;
  parseError?: string;
  /** Recipes log connection failures in non-production. */
  logFailures?: boolean;
  failureError?: string;
};

/** Loopback-only Ollama /api/chat with JSON schema formatting. Returns parsed JSON. */
export async function fetchOllamaChatJson(
  options: OllamaChatJsonOptions,
): Promise<unknown> {
  const baseUrl = loopbackOllamaBaseUrl();
  const content =
    options.appendNoThink && !options.prompt.includes('/no_think')
      ? `${options.prompt} /no_think`
      : options.prompt;
  const message: {
    role: 'user';
    content: string;
    images?: string[];
  } = { role: 'user', content };
  if (options.imageDataUrls?.length) {
    message.images = options.imageDataUrls.map((image) =>
      image.slice(image.indexOf(',') + 1),
    );
  }

  let response: Response;
  try {
    response = await guardedFetch(
      'ollama',
      new URL('/api/chat', baseUrl),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model,
          stream: false,
          think: false,
          format: options.schema,
          keep_alive: '15m',
          options: {
            temperature: 0,
            num_predict: options.numPredict ?? 900,
            ...(options.numCtx !== undefined ? { num_ctx: options.numCtx } : {}),
          },
          messages: [message],
        }),
      },
      {
        timeoutMs: options.timeoutMs ?? 120_000,
        maxConcurrency: 1,
      },
    );
  } catch (error) {
    if (options.logFailures && process.env.NODE_ENV !== 'production') {
      console.warn(
        'Local model connection failed:',
        error instanceof Error ? error.message : String(error),
      );
    }
    throw new Error(options.failureError ?? 'OLLAMA_UNAVAILABLE');
  }

  if (!response.ok) {
    if (options.logFailures && process.env.NODE_ENV !== 'production') {
      console.warn(
        'Local model request failed:',
        response.status,
        (await response.text()).slice(0, 300),
      );
    }
    throw new Error(options.failureError ?? 'OLLAMA_UNAVAILABLE');
  }

  const body = (await response.json()) as {
    message?: { content?: string; thinking?: string };
  };
  const text = body.message?.content || body.message?.thinking;
  if (!text) throw new Error(options.emptyError ?? 'INVALID_ANALYSIS');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(options.parseError ?? options.emptyError ?? 'INVALID_ANALYSIS');
  }
}

export function defaultOpenAIModel(
  ...candidates: (string | undefined)[]
): string {
  return candidates.find((value) => typeof value === 'string' && value.trim()) ??
    'gpt-5.6-terra';
}

export function defaultOllamaModel(
  ...candidates: (string | undefined)[]
): string {
  return candidates.find((value) => typeof value === 'string' && value.trim()) ??
    'qwen3-vl:2b';
}
