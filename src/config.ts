export const configurationSection = "deepseekCommit";

export interface CommitMessageSettings {
  enabled: boolean;
  maxDiffChars: number;
  maxTokens: number;
  instructions: string;
}

export interface DeepSeekCommitSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  commitMessage: CommitMessageSettings;
}

export interface ConfigurationReader {
  get<T>(key: string, defaultValue: T): T | undefined;
}

export const defaultSettings: DeepSeekCommitSettings = {
  apiKey: "",
  baseUrl: "https://api.deepseek.com/beta",
  model: "deepseek-v4-flash",
  timeoutMs: 15000,
  commitMessage: {
    enabled: true,
    maxDiffChars: 12000,
    maxTokens: 1000,
    instructions: "",
  },
};

export function readDeepSeekCommitSettings(configuration: ConfigurationReader): DeepSeekCommitSettings {
  const defaults = defaultSettings;
  const commitMessageDefaults = defaults.commitMessage;

  return {
    apiKey: readString(configuration.get("apiKey", defaults.apiKey), defaults.apiKey).trim(),
    baseUrl: readString(configuration.get("baseUrl", defaults.baseUrl), defaults.baseUrl),
    model: readString(configuration.get("model", defaults.model), defaults.model),
    timeoutMs: configuration.get("timeoutMs", defaults.timeoutMs) ?? defaults.timeoutMs,
    commitMessage: {
      enabled:
        configuration.get("commitMessage.enabled", commitMessageDefaults.enabled) ?? commitMessageDefaults.enabled,
      maxDiffChars:
        configuration.get("commitMessage.maxDiffChars", commitMessageDefaults.maxDiffChars) ??
        commitMessageDefaults.maxDiffChars,
      maxTokens:
        configuration.get("commitMessage.maxTokens", commitMessageDefaults.maxTokens) ??
        commitMessageDefaults.maxTokens,
      instructions: readString(
        configuration.get("commitMessage.instructions", commitMessageDefaults.instructions),
        commitMessageDefaults.instructions,
      ).trim(),
    },
  };
}

function readString(value: unknown, defaultValue: string): string {
  return typeof value === "string" ? value : defaultValue;
}
