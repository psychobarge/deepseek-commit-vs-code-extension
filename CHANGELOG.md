# Changelog

## 0.0.3

- Fixed the Source Control progress spinner that kept spinning forever when generation failed; the error is now shown once the progress ends.
- Disabled DeepSeek thinking mode: reasoning tokens are billed as output and shared the `maxTokens` budget, which truncated or emptied commit messages on large diffs.
- Removed the `deepseekCommit.temperature` setting: DeepSeek's thinking models ignore it.
- Raised `deepseekCommit.commitMessage.maxTokens` from `400` to `1000`.
- Changes made of untracked files only now ask you to run `git add` instead of sending an empty diff to DeepSeek.

## 0.0.2

- Added an extension icon.

## 0.0.1

- Initial release: generate Git commit messages from staged (or unstaged) changes with DeepSeek.
