# Memory Setup

Use this workflow to set up a lightweight memory bank for a repository.

The command creates a small set of files that help an AI coding tool separate
stable project knowledge from short-term working context.

## Command

```text
/memory-setup
/memory-setup <name>
```

If a name is provided, create a named memory bank. Otherwise create the default
memory bank.

## Memory Layout

Use three layers:

```text
.cursor/brain/projectBrief.md
.cursor/memory/activeContext.md
.cursor/memory/domains/
```

For a named memory bank, suffix the memory directory with the provided name:

```text
.cursor/memory-<name>/
.cursor/memory-<name>/domains/
```

## Files

Create these directories:

```text
.cursor/rules/
.cursor/skills/memory-manager/
.cursor/brain/
<memory-dir>/domains/
```

Create the project brief:

```markdown
# Project Brief

## Global Rules

- Architecture:
- Naming:
- Styling:

## Domain Registry

- Add domain files here as the project grows.
```

Create the active context:

```markdown
# Active Context

## Current Work

- Repository memory initialized.

## Next Steps

- Fill in project-specific rules.
- Update this file after meaningful work.
```

Create a domain template:

```markdown
# Domain Notes

## Current Truths

- Record stable domain rules here.

## Open Questions

- Track uncertain behavior here until it is resolved.
```

Create a driver rule that tells the agent to:

1. read `projectBrief.md` and `activeContext.md` at the start of work;
2. choose relevant domain notes only when needed;
3. update active context after meaningful changes;
4. avoid rewriting stable domain knowledge unless the new information is more
   precise.

## Finish

Reply exactly:

```text
Initialized. (Rules in Brief, Progress in Context)
```
