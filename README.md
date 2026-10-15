# DeepSeek Commit

A deliberately tiny VS Code extension that writes Git commit messages with DeepSeek's chat completions API.

I made this because i heavily use 
https://github.com/lhr0909/deepseek-fim-autocomplete-vscode-extension by Simon Liang


## Features

- Sparkle button in the Source Control view toolbar that asks DeepSeek for a Conventional Commits message.
- A button inside the commit message box is not possible: VS Code only exposes that spot through the proposed `contribSourceControlInputBoxMenu` API, which cannot be used by a published extension.
- Uses the staged diff, and falls back to the working tree diff (with the list of untracked files) when nothing is staged.
- Never overwrites a commit message you already typed.
- Simple JSON settings for API key, model, base URL, timeout, diff size and extra instructions.
- Unit tests for the core request/config/message logic.

## Settings

Add these to your VS Code `settings.json`:

```json
{
  "deepseekCommit.apiKey": "YOUR_DEEPSEEK_API_KEY",
  "deepseekCommit.model": "deepseek-v4-flash",
  "deepseekCommit.baseUrl": "https://api.deepseek.com/beta",
  "deepseekCommit.commitMessage.instructions": "Be concise and precise."
}
```

`deepseekCommit.commitMessage.maxDiffChars` (default `12000`) truncates large diffs before they are sent, and `deepseekCommit.commitMessage.maxTokens` (default `1000`) caps the generated message.

Temperature is not configurable: DeepSeek's thinking models ignore it. The extension sends `thinking: { type: "disabled" }` so reasoning tokens cannot eat the message budget.

## Generate a commit message

Stage your changes (unstaged changes are used when nothing is staged), then click the sparkle icon in the Source Control view title bar, or run **DeepSeek Commit: Generate Commit Message** from the Command Palette. The message is written to the commit message box only if it is empty.

No keybinding is assigned by default; bind `deepseekCommit.generateCommitMessage` yourself if you want one.

## Installation 

Disponible on  
[Open VSX ](https://open-vsx.org/)
[VS Code Marketplace ](https://marketplace.visualstudio.com/VSCode)

After installing, reload VS Code and set `deepseekCommit.apiKey` in `settings.json`.