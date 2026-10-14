import * as vscode from "vscode";
import { generateCommitMessage } from "./commitMessageCommand";
import { configurationSection } from "./config";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("deepseekCommit.generateCommitMessage", () => generateCommitMessage()),
    vscode.commands.registerCommand("deepseekCommit.openSettings", () =>
      vscode.commands.executeCommand("workbench.action.openSettings", configurationSection),
    ),
  );
}

export function deactivate(): void {}
