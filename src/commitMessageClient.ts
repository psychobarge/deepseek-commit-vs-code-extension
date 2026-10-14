import {
  buildChatCompletionsUrl,
  buildCommitMessageMessages,
  buildCommitMessageRequestBody,
  CommitMessageContext,
  extractChatCompletionText,
  normalizeCommitMessage,
} from "./commitMessage";
import { FetchImplementation, postJson } from "./deepseekClient";

export interface CommitMessageClientOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  context: CommitMessageContext;
}

export async function requestCommitMessage(
  options: CommitMessageClientOptions,
  abortSignal?: AbortSignal,
  fetchImplementation: FetchImplementation = fetch,
): Promise<string> {
  const responseBody = await postJson(
    {
      url: buildChatCompletionsUrl(options.baseUrl),
      apiKey: options.apiKey,
      timeoutMs: options.timeoutMs,
    },
    buildCommitMessageRequestBody(
      buildCommitMessageMessages(options.context),
      options.model,
      options.maxTokens,
      options.temperature,
    ),
    abortSignal,
    fetchImplementation,
  );

  const message = normalizeCommitMessage(extractChatCompletionText(responseBody));
  if (message.length === 0) {
    throw new Error("DeepSeek returned an empty commit message.");
  }

  return message;
}
