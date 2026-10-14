import * as vscode from "vscode";
import { ChangeSet, chooseChangeSet } from "./commitMessage";

/**
 * Minimal subset of the built-in Git extension API
 * (https://github.com/microsoft/vscode/blob/main/extensions/git/src/api/git.d.ts).
 */
export interface GitExtension {
  readonly enabled: boolean;
  getAPI(version: 1): GitApi;
}

export interface GitChange {
  readonly uri: vscode.Uri;
  readonly status: number;
}

export interface GitRepository {
  readonly rootUri: vscode.Uri;
  readonly inputBox: { value: string };
  readonly state: {
    readonly indexChanges: GitChange[];
    readonly workingTreeChanges: GitChange[];
    readonly untrackedChanges?: GitChange[];
  };
  diff(cached?: boolean): Promise<string>;
}

export interface GitApi {
  readonly repositories: GitRepository[];
  getRepository(uri: vscode.Uri): GitRepository | null;
}

export interface GitChangeSet extends ChangeSet {
  untrackedPaths: string[];
}

// Git API `Status.UNTRACKED`.
const untrackedStatus = 7;

export async function getGitApi(): Promise<GitApi | undefined> {
  const extension = vscode.extensions.getExtension<GitExtension>("vscode.git");
  if (!extension) {
    return undefined;
  }

  const git = extension.isActive ? extension.exports : await extension.activate();
  if (!git?.enabled) {
    return undefined;
  }

  return git.getAPI(1);
}

export async function resolveRepository(git: GitApi): Promise<GitRepository | undefined> {
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  const activeRepository = activeUri ? git.getRepository(activeUri) : null;
  if (activeRepository) {
    return activeRepository;
  }

  if (git.repositories.length === 1) {
    return git.repositories[0];
  }

  if (git.repositories.length === 0) {
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    git.repositories.map((repository) => ({
      label: vscode.workspace.asRelativePath(repository.rootUri, false),
      repository,
    })),
    { placeHolder: "Select the repository to describe" },
  );

  return picked?.repository;
}

export function hasChanges(repository: GitRepository): boolean {
  const state = repository.state;
  return (
    state.indexChanges.length > 0 ||
    state.workingTreeChanges.length > 0 ||
    (state.untrackedChanges?.length ?? 0) > 0
  );
}

export async function readChangeSet(repository: GitRepository): Promise<GitChangeSet> {
  const hasStagedChanges = repository.state.indexChanges.length > 0;
  const changeSet = chooseChangeSet({
    hasStagedChanges,
    stagedDiff: hasStagedChanges ? await repository.diff(true) : "",
    workingTreeDiff: hasStagedChanges ? "" : await repository.diff(false),
  });

  return {
    ...changeSet,
    untrackedPaths: changeSet.source === "workingTree" ? readUntrackedPaths(repository) : [],
  };
}

function readUntrackedPaths(repository: GitRepository): string[] {
  const changes =
    repository.state.untrackedChanges ??
    repository.state.workingTreeChanges.filter((change) => change.status === untrackedStatus);

  return changes
    .map((change) => vscode.workspace.asRelativePath(change.uri, false))
    .sort((left, right) => left.localeCompare(right));
}
