---
name: memo
description: Use when recording a short note, decision, or progress update into the active Wingman memory context without running the full memory sync workflow.
---

# Memo

Use this workflow to update the repository memory after meaningful work.

`memo` is the companion to `init-momory`: initialization creates the memory
files, and memo keeps the active context useful over time.

## Command

```text
/memo
/memo <note>
```

## Locate Memory

Find the active context file:

1. Prefer the most recently modified `.cursor/memory-*/activeContext.md`.
2. Fall back to `.cursor/memory/activeContext.md`.

If no active context file exists, ask the user to run `init-momory` first.

## Analyze

When the user runs `/memo` without extra text:

- review the current work session;
- summarize what changed;
- record important decisions;
- list concrete next steps.

When the user provides `/memo <note>`:

- follow the note directly;
- place it in the most relevant section;
- preserve existing useful context.

## Edit

Update only the marked memory sections.

- Do not rewrite the whole active context file.
- Keep the content concise.
- Write project notes in Chinese when the repository memory is Chinese.
- Preserve older useful entries unless they are clearly obsolete.

## Confirm

Reply with:

```text
进度已同步: <brief summary>
```
