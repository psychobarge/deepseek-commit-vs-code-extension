import assert from "node:assert/strict";
import test from "node:test";
import { CommitMessageClientOptions, requestCommitMessage } from "../src/commitMessageClient";
import { FetchImplementation } from "../src/deepseekClient";

const baseOptions: CommitMessageClientOptions = {
  apiKey: "sk-test",
  baseUrl: "https://api.deepseek.com/beta/",
  model: "deepseek-v4-flash",
  maxTokens: 400,
  timeoutMs: 15000,
  context: {
    diff: "diff --git a/src/a.ts b/src/a.ts\n+const a = 1;",
    source: "staged",
    untrackedPaths: [],
    instructions: "",
  },
};

test("requestCommitMessage posts a chat request and returns a cleaned message", async () => {
  const calls: Array<{ input: string; init: RequestInit }> = [];
  const fetchImplementation: FetchImplementation = async (input, init) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ choices: [{ message: { content: "```\nfeat: add a constant\n```" } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const message = await requestCommitMessage(baseOptions, undefined, fetchImplementation);

  assert.equal(message, "feat: add a constant");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, "https://api.deepseek.com/beta/chat/completions");
  assert.deepEqual(calls[0].init.headers, {
    "Content-Type": "application/json",
    Authorization: "Bearer sk-test",
  });

  const body = JSON.parse(calls[0].init.body as string);
  assert.equal(body.model, "deepseek-v4-flash");
  assert.equal(body.max_tokens, 400);
  assert.deepEqual(body.thinking, { type: "disabled" });
  assert.equal(body.stream, false);
  assert.equal(body.messages.length, 2);
  assert.match(body.messages[1].content, /const a = 1/);
});

test("requestCommitMessage reports HTTP errors", async () => {
  const fetchImplementation: FetchImplementation = async () => new Response("invalid key", {
    status: 401,
    statusText: "Unauthorized",
  });

  await assert.rejects(
    () => requestCommitMessage(baseOptions, undefined, fetchImplementation),
    /401 Unauthorized\): invalid key/,
  );
});

test("requestCommitMessage rejects empty messages", async () => {
  const fetchImplementation: FetchImplementation = async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: "   " } }] }), { status: 200 });

  await assert.rejects(() => requestCommitMessage(baseOptions, undefined, fetchImplementation), /empty commit message/);
});
