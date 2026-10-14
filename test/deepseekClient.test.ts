import assert from "node:assert/strict";
import test from "node:test";
import { postJson } from "../src/deepseekClient";

const options = {
  url: "https://api.deepseek.com/beta/chat/completions",
  apiKey: "sk-test",
  timeoutMs: 15000,
};

test("postJson posts a JSON body and returns the parsed response", async () => {
  const calls: Array<{ input: string; init: RequestInit }> = [];
  const fetchImplementation = async (input: string, init: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ choices: [] }), { status: 200 });
  };

  const body = await postJson(options, { model: "deepseek-v4-flash" }, undefined, fetchImplementation);

  assert.deepEqual(body, { choices: [] });
  assert.equal(calls[0].input, options.url);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.body, JSON.stringify({ model: "deepseek-v4-flash" }));
  assert.deepEqual(calls[0].init.headers, {
    "Content-Type": "application/json",
    Authorization: "Bearer sk-test",
  });
});

test("postJson reports HTTP errors with the response body", async () => {
  const fetchImplementation = async () => new Response("invalid key", { status: 401, statusText: "Unauthorized" });

  await assert.rejects(() => postJson(options, {}, undefined, fetchImplementation), /DeepSeek request failed \(401 Unauthorized\): invalid key/);
});

test("postJson passes through an already-aborted signal", async () => {
  const abortController = new AbortController();
  abortController.abort();

  const fetchImplementation = async (_input: string, init: RequestInit) => {
    assert.equal(init.signal?.aborted, true);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  await postJson(options, {}, abortController.signal, fetchImplementation);
});
