import assert from "node:assert/strict";
import test from "node:test";
import {
  buildChatCompletionsUrl,
  buildCommitMessageMessages,
  buildCommitMessageRequestBody,
  chooseChangeSet,
  CommitMessageContext,
  diffTruncationMarker,
  extractChatCompletionText,
  normalizeCommitMessage,
  truncateDiff,
} from "../src/commitMessage";

const baseContext: CommitMessageContext = {
  diff: "diff --git a/src/a.ts b/src/a.ts\n+const a = 1;",
  source: "staged",
  untrackedPaths: [],
  instructions: "",
};

test("buildChatCompletionsUrl appends chat completions to a trimmed base URL", () => {
  assert.equal(buildChatCompletionsUrl("https://api.deepseek.com/beta/"), "https://api.deepseek.com/beta/chat/completions");
});

test("truncateDiff keeps short diffs untouched", () => {
  assert.equal(truncateDiff("abc", 10), "abc");
});

test("truncateDiff slices long diffs and marks the truncation", () => {
  assert.equal(truncateDiff("abcdef", 3), `abc\n${diffTruncationMarker}`);
});

test("chooseChangeSet prefers staged changes", () => {
  assert.deepEqual(chooseChangeSet({ hasStagedChanges: true, stagedDiff: "staged", workingTreeDiff: "work" }), {
    source: "staged",
    diff: "staged",
  });
});

test("chooseChangeSet falls back to the working tree", () => {
  assert.deepEqual(chooseChangeSet({ hasStagedChanges: false, stagedDiff: "", workingTreeDiff: "work" }), {
    source: "workingTree",
    diff: "work",
  });
});

test("buildCommitMessageMessages asks for Conventional Commits and embeds the diff", () => {
  const messages = buildCommitMessageMessages(baseContext);

  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, "system");
  assert.match(messages[0].content, /Conventional Commits/);
  assert.equal(messages[1].role, "user");
  assert.match(messages[1].content, /Staged changes \(unified diff\):/);
  assert.match(messages[1].content, /\+const a = 1;/);
  assert.equal(messages[1].content.includes("Untracked files"), false);
  assert.equal(messages[1].content.includes("Additional instructions"), false);
});

test("buildCommitMessageMessages lists untracked files for working tree changes", () => {
  const messages = buildCommitMessageMessages({
    ...baseContext,
    source: "workingTree",
    untrackedPaths: ["src/b.ts", "src/c.ts"],
  });

  assert.match(messages[1].content, /Unstaged changes \(unified diff\):/);
  assert.match(messages[1].content, /Untracked files \(contents not shown\):\n- src\/b\.ts\n- src\/c\.ts/);
});

test("buildCommitMessageMessages appends configured instructions", () => {
  const messages = buildCommitMessageMessages({ ...baseContext, instructions: "  Write the message in French.  " });

  assert.match(messages[1].content, /Additional instructions:\nWrite the message in French\.$/);
});

test("buildCommitMessageRequestBody maps to the DeepSeek chat fields", () => {
  const messages = buildCommitMessageMessages(baseContext);

  assert.deepEqual(buildCommitMessageRequestBody(messages, "deepseek-v4-pro", 400, 0.2), {
    model: "deepseek-v4-pro",
    messages,
    max_tokens: 400,
    temperature: 0.2,
    stream: false,
  });
});

test("extractChatCompletionText returns the first choice message", () => {
  const text = extractChatCompletionText({ choices: [{ message: { role: "assistant", content: "feat: add a" } }] });

  assert.equal(text, "feat: add a");
});

test("extractChatCompletionText rejects malformed response bodies", () => {
  assert.throws(() => extractChatCompletionText({ choices: [] }), /did not include any completion choices/);
  assert.throws(() => extractChatCompletionText({ choices: [{ message: { content: 42 } }] }), /did not include a message/);
});

test("normalizeCommitMessage strips fences, quotes and surrounding whitespace", () => {
  assert.equal(normalizeCommitMessage("\n```\nfeat: add a\n\nBody line.\n```\n"), "feat: add a\n\nBody line.");
  assert.equal(normalizeCommitMessage('"fix: repair the parser"'), "fix: repair the parser");
  assert.equal(normalizeCommitMessage("  chore: bump deps  "), "chore: bump deps");
});
