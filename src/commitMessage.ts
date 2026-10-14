export type ChangeSource = "staged" | "workingTree";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface CommitMessageContext {
  diff: string;
  source: ChangeSource;
  untrackedPaths: string[];
  instructions: string;
}

export interface DeepSeekChatRequestBody {
  model: string;
  messages: ChatMessage[];
  max_tokens: number;
  temperature: number;
  stream: false;
}

export interface ChangeSet {
  source: ChangeSource;
  diff: string;
}

export const diffTruncationMarker = "... [diff truncated] ...";

const systemPrompt = [
  "You write Git commit messages in the Conventional Commits format.",
  "Reply with the commit message only: no explanations, no code fences, no quotes.",
  "Use an imperative subject of at most 72 characters, followed by an optional body explaining what changed and why when it is not obvious.",
  "Write in English unless the additional instructions say otherwise.",
].join(" ");

export function buildChatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

export function truncateDiff(diff: string, maxChars: number): string {
  const limit = Math.max(0, maxChars);
  if (diff.length <= limit) {
    return diff;
  }

  return `${diff.slice(0, limit)}\n${diffTruncationMarker}`;
}

export function chooseChangeSet(options: {
  hasStagedChanges: boolean;
  stagedDiff: string;
  workingTreeDiff: string;
}): ChangeSet {
  if (options.hasStagedChanges) {
    return { source: "staged", diff: options.stagedDiff };
  }

  return { source: "workingTree", diff: options.workingTreeDiff };
}

export function buildCommitMessageMessages(context: CommitMessageContext): ChatMessage[] {
  const parts = [
    context.source === "staged"
      ? "Staged changes (unified diff):"
      : "Unstaged changes (unified diff):",
    "```diff",
    context.diff,
    "```",
  ];

  if (context.source === "workingTree" && context.untrackedPaths.length > 0) {
    parts.push(
      `Untracked files (contents not shown):\n${context.untrackedPaths.map((path) => `- ${path}`).join("\n")}`,
    );
  }

  const instructions = context.instructions.trim();
  if (instructions.length > 0) {
    parts.push(`Additional instructions:\n${instructions}`);
  }

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: parts.join("\n") },
  ];
}

export function buildCommitMessageRequestBody(
  messages: ChatMessage[],
  model: string,
  maxTokens: number,
  temperature: number,
): DeepSeekChatRequestBody {
  return {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: false,
  };
}

export function extractChatCompletionText(responseBody: unknown): string {
  if (!isRecord(responseBody) || !Array.isArray(responseBody.choices) || responseBody.choices.length === 0) {
    throw new Error("DeepSeek chat response did not include any completion choices.");
  }

  const [firstChoice] = responseBody.choices;
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message) || typeof firstChoice.message.content !== "string") {
    throw new Error("DeepSeek chat response choice did not include a message.");
  }

  return firstChoice.message.content;
}

export function normalizeCommitMessage(text: string): string {
  let message = text.trim();

  const fenced = /^```[a-zA-Z]*\n([\s\S]*?)\n?```$/.exec(message);
  if (fenced) {
    message = fenced[1].trim();
  }

  return message.replace(/^["'`]+|["'`]+$/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
