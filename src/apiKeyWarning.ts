import * as vscode from "vscode";

let warningShown = false;

export async function warnMissingApiKey(): Promise<void> {
  if (warningShown) {
    return;
  }

  warningShown = true;
  const selection = await vscode.window.showWarningMessage(
    "DeepSeek Commit needs deepseekCommit.apiKey in settings.json.",
    "Open Settings",
  );

  if (selection === "Open Settings") {
    await vscode.commands.executeCommand("deepseekCommit.openSettings");
  }
}
