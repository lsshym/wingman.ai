# Init Momory

Use this workflow to initialize a lightweight memory bank for a repository.

The command creates a small set of files that help an AI coding tool remember
the project brief and the current working context.

## Command

```text
/init
/init <name>
```

If a name is provided, create a named memory bank. Otherwise create the default
memory bank.

## Paths

For the default memory bank:

```text
.cursor/memory/
.cursor/rules/memory-bank.mdc
```

For a named memory bank:

```text
.cursor/memory-<name>/
.cursor/rules/memory-<name>.mdc
```

## Files

Create these directories:

```text
.cursor/rules/
.cursor/skills/memory-manager/
<memory-dir>/
```

Create the project brief:

```markdown
# Project Brief

## Stack

- Frontend:
- Language:
- Styling:

## Rules

- Follow the existing project structure.
- Keep names consistent with the codebase.
- Avoid broad refactors unless the task requires them.
```

Create the active context:

```markdown
# Active Context

## Current Progress

- Repository memory initialized.

## Next Steps

- Fill in project-specific rules.
- Update this file after meaningful work.
```

Create a driver rule that tells the agent to read both files at the start of
work and update the active context after meaningful changes.

## Finish

Reply exactly:

```text
Initialized. (Rules in Brief, Progress in Context)
```
