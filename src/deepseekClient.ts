export interface PostJsonOptions {
  url: string;
  apiKey: string;
  timeoutMs: number;
}

export type FetchImplementation = (input: string, init: RequestInit) => Promise<Response>;

export async function postJson(
  options: PostJsonOptions,
  body: unknown,
  abortSignal?: AbortSignal,
  fetchImplementation: FetchImplementation = fetch,
): Promise<unknown> {
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), options.timeoutMs);
  const abortRequest = () => timeoutController.abort();

  if (abortSignal?.aborted) {
    timeoutController.abort();
  } else {
    abortSignal?.addEventListener("abort", abortRequest);
  }

  try {
    const response = await fetchImplementation(options.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: timeoutController.signal,
    });

    if (!response.ok) {
      throw new Error(await createErrorMessage(response));
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
    abortSignal?.removeEventListener("abort", abortRequest);
  }
}

async function createErrorMessage(response: Response): Promise<string> {
  const responseText = await response.text();
  const statusText = response.statusText ? ` ${response.statusText}` : "";
  const detail = responseText ? `: ${responseText}` : "";

  return `DeepSeek request failed (${response.status}${statusText})${detail}`;
}
