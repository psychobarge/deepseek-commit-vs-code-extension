import * as vscode from "vscode";
import { warnMissingApiKey } from "./apiKeyWarning";
import { truncateDiff } from "./commitMessage";
import { CommitMessageClientOptions, requestCommitMessage } from "./commitMessageClient";
import { configurationSection, DeepSeekCommitSettings, readDeepSeekCommitSettings } from "./config";
import { getGitApi, GitRepository, hasChanges, readChangeSet, resolveRepository } from "./gitApi";

type CommitMessageRequester = (options: CommitMessageClientOptions, abortSignal?: AbortSignal) => Promise<string>;

interface CommitMessageCommandDependencies {
  readSettings?: () => DeepSeekCommitSettings;
  requestMessage?: CommitMessageRequester;
  resolveGitRepository?: () => Promise<GitRepository | undefined>;
}

export async function generateCommitMessage(dependencies: CommitMessageCommandDependencies = {}): Promise<void> {
  const readSettings =
    dependencies.readSettings ??
    (() => readDeepSeekCommitSettings(vscode.workspace.getConfiguration(configurationSection)));
  const requestMessage = dependencies.requestMessage ?? requestCommitMessage;
  const resolveGitRepository = dependencies.resolveGitRepository ?? resolveRepositoryFromWorkspace;

  const settings = readSettings();
  if (!settings.commitMessage.enabled) {
    await vscode.window.showInformationMessage(
      "DeepSeek Commit commit message generation is disabled (deepseekCommit.commitMessage.enabled).",
    );
    return;
  }

  if (!settings.apiKey) {
    await warnMissingApiKey();
    return;
  }

  const repository = await resolveGitRepository();
  if (!repository) {
    await vscode.window.showInformationMessage("DeepSeek Commit could not find a Git repository to describe.");
    return;
  }

  if (repository.inputBox.value.trim().length > 0) {
    await vscode.window.showWarningMessage(
      "The Source Control commit message box is not empty. Clear it before generating a message.",
    );
    return;
  }

  if (!hasChanges(repository)) {
    await vscode.window.showInformationMessage("DeepSeek Commit found no Git changes to describe.");
    return;
  }

  const generationError = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.SourceControl, title: "Generating commit message", cancellable: true },
    async (_progress, token): Promise<string | undefined> => {
      const abortController = new AbortController();
      const cancellation = token.onCancellationRequested(() => abortController.abort());

      try {
        const changeSet = await readChangeSet(repository);
        const message = await requestMessage(
          {
            apiKey: settings.apiKey,
            baseUrl: settings.baseUrl,
            model: settings.model,
            maxTokens: settings.commitMessage.maxTokens,
            timeoutMs: settings.timeoutMs,
            context: {
              diff: truncateDiff(changeSet.diff, settings.commitMessage.maxDiffChars),
              source: changeSet.source,
              untrackedPaths: changeSet.untrackedPaths,
              instructions: settings.commitMessage.instructions,
            },
          },
          abortController.signal,
        );

        if (!token.isCancellationRequested) {
          repository.inputBox.value = message;
        }
      } catch (error) {
        if (!token.isCancellationRequested) {
          console.error("DeepSeek Commit commit message generation failed", error);
          return `DeepSeek Commit commit message generation failed: ${readErrorMessage(error)}`;
        }
      } finally {
        cancellation.dispose();
      }

      return undefined;
    },
  );

  // Shown outside withProgress: that thenable only resolves once the notification is dismissed,
  // which would otherwise leave the Source Control progress spinner spinning forever.
  if (generationError) {
    await vscode.window.showErrorMessage(generationError);
  }
}

async function resolveRepositoryFromWorkspace(): Promise<GitRepository | undefined> {
  const git = await getGitApi();
  return git ? resolveRepository(git) : undefined;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
