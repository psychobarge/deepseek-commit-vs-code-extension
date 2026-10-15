import assert from "node:assert/strict";
import test from "node:test";
import { ConfigurationReader, defaultSettings, readDeepSeekCommitSettings } from "../src/config";

class TestConfiguration implements ConfigurationReader {
  public constructor(private readonly values: Record<string, unknown> = {}) {}

  public get<T>(key: string, defaultValue: T): T | undefined {
    return Object.prototype.hasOwnProperty.call(this.values, key) ? (this.values[key] as T) : defaultValue;
  }
}

test("readDeepSeekCommitSettings returns defaults", () => {
  assert.deepEqual(readDeepSeekCommitSettings(new TestConfiguration()), defaultSettings);
});

test("readDeepSeekCommitSettings reads configured values", () => {
  const settings = readDeepSeekCommitSettings(
    new TestConfiguration({
      apiKey: "  sk-test  ",
      baseUrl: "https://example.test/beta/",
      model: "custom-chat-model",
      timeoutMs: 3000,
      "commitMessage.enabled": false,
      "commitMessage.maxDiffChars": 5000,
      "commitMessage.maxTokens": 256,
      "commitMessage.instructions": "  Write the message in French.  ",
    }),
  );

  assert.deepEqual(settings, {
    apiKey: "sk-test",
    baseUrl: "https://example.test/beta/",
    model: "custom-chat-model",
    timeoutMs: 3000,
    commitMessage: {
      enabled: false,
      maxDiffChars: 5000,
      maxTokens: 256,
      instructions: "Write the message in French.",
    },
  });
});

test("readDeepSeekCommitSettings falls back to an empty commit message instruction", () => {
  const settings = readDeepSeekCommitSettings(new TestConfiguration({ "commitMessage.instructions": 42 }));

  assert.equal(settings.commitMessage.instructions, "");
});
