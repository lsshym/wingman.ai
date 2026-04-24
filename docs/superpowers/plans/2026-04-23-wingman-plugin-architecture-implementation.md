# Wingman Plugin Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the current repository root into a publishable `wingman` plugin package with shared `skills/` and `rules/` cores plus Cursor and Codex metadata shells.

**Architecture:** The repository root remains the package root. Runtime Markdown files move from `commands/` into `skills/`, runtime rule files move from `user-rules/` into `rules/`, and platform-specific differences are isolated to `.cursor-plugin/plugin.json` and `.codex/marketplace.json`. Root metadata is completed by adding `package.json`, rewriting `README.md` for `wingman`, pruning non-runtime files, and verifying the final structure.

**Tech Stack:** Markdown, JSON, npm package metadata, shell file operations, git status verification

---

Current user preference: do not create commits during execution. This plan therefore omits commit steps and keeps all work uncommitted unless the user later asks for commits.

## File Map

### Files To Create

- `.cursor-plugin/plugin.json`
  Purpose: Cursor metadata shell pointing to the shared `skills/` and `rules/` directories.
- `.codex/marketplace.json`
  Purpose: Codex metadata shell declaring the repository root as the `wingman` plugin source.
- `package.json`
  Purpose: Root package identity for public plugin distribution.
- `skills/`
  Purpose: Shared runtime skill prompt directory.
- `rules/`
  Purpose: Shared runtime rule prompt directory.

### Files To Modify

- `README.md`
  Purpose: Replace Cursor-only positioning with cross-platform `wingman` plugin documentation.

### Files To Move

- `commands/api-bind.md` -> `skills/api-bind.md`
- `commands/find.md` -> `skills/find.md`
- `commands/init-momory.md` -> `skills/init-momory.md`
- `commands/memo.md` -> `skills/memo.md`
- `commands/refactor-types.md` -> `skills/refactor-types.md`
- `commands/refactor.md` -> `skills/refactor.md`
- `commands/reg.md` -> `skills/reg.md`
- `commands/zod-gen.md` -> `skills/zod-gen.md`
- `user-rules/HIERARCHY PROTOCOL.md` -> `rules/HIERARCHY PROTOCOL.md`
- `user-rules/SYSTEM CORE` -> `rules/SYSTEM CORE.md`

### Files To Delete

- `example/activeContext.md`
- `example/`
- `commands/api-bind.zh.md`
- `commands/init-momory.zh.md`
- `commands/init-momory.readme.md`
- `commands/init-momory-buff.md`
- `commands/memo.zh.md`
- `commands/refactor-types.zh.md`
- `commands/refactor.zh.md`
- `commands/`
- `user-rules/`

### Files To Keep Untouched

- `skills/*.md` migrated content
- `rules/*.md` migrated content
- `LICENSE`
- `模型生态选型报告.md`

## Task 1: Baseline Inventory And Target Directories

**Files:**
- Create: `.cursor-plugin/`
- Create: `.codex/`
- Create: `skills/`
- Create: `rules/`
- Verify: `commands/`
- Verify: `user-rules/`
- Verify: `example/`

- [ ] **Step 1: Capture the baseline file inventory**

Run:

```bash
rg --files | sort
```

Expected:

```text
commands/api-bind.md
commands/api-bind.zh.md
commands/find.md
commands/init-momory-buff.md
commands/init-momory.md
commands/init-momory.readme.md
commands/init-momory.zh.md
commands/memo.md
commands/memo.zh.md
commands/refactor-types.md
commands/refactor-types.zh.md
commands/refactor.md
commands/refactor.zh.md
commands/reg.md
commands/zod-gen.md
docs/superpowers/plans/2026-04-23-wingman-plugin-architecture-implementation.md
docs/superpowers/specs/2026-04-23-wingman-plugin-architecture-design.md
example/activeContext.md
README.md
user-rules/HIERARCHY PROTOCOL.md
user-rules/SYSTEM CORE
LICENSE
模型生态选型报告.md
```

- [ ] **Step 2: Create the target plugin directories**

Run:

```bash
mkdir -p .cursor-plugin .codex skills rules
```

Expected:

```text
Command exits with status 0 and creates the four target directories if they do not already exist.
```

- [ ] **Step 3: Verify the new directories exist before moving files**

Run:

```bash
ls -d .cursor-plugin .codex skills rules
```

Expected:

```text
.codex
.cursor-plugin
rules
skills
```

## Task 2: Migrate Shared Core Files

**Files:**
- Modify: `skills/api-bind.md`
- Modify: `skills/find.md`
- Modify: `skills/init-momory.md`
- Modify: `skills/memo.md`
- Modify: `skills/refactor-types.md`
- Modify: `skills/refactor.md`
- Modify: `skills/reg.md`
- Modify: `skills/zod-gen.md`
- Modify: `rules/HIERARCHY PROTOCOL.md`
- Modify: `rules/SYSTEM CORE.md`

- [ ] **Step 1: Move runtime skill files from `commands/` into `skills/`**

Run:

```bash
mv commands/api-bind.md skills/api-bind.md
mv commands/find.md skills/find.md
mv commands/init-momory.md skills/init-momory.md
mv commands/memo.md skills/memo.md
mv commands/refactor-types.md skills/refactor-types.md
mv commands/refactor.md skills/refactor.md
mv commands/reg.md skills/reg.md
mv commands/zod-gen.md skills/zod-gen.md
```

Expected:

```text
Command exits with status 0 and leaves the eight runtime Markdown files under skills/.
```

- [ ] **Step 2: Move runtime rule files from `user-rules/` into `rules/`**

Run:

```bash
mv "user-rules/HIERARCHY PROTOCOL.md" "rules/HIERARCHY PROTOCOL.md"
mv "user-rules/SYSTEM CORE" "rules/SYSTEM CORE.md"
```

Expected:

```text
Command exits with status 0 and leaves the two runtime rule files under rules/.
```

- [ ] **Step 3: Verify the migrated core inventory**

Run:

```bash
find skills rules -maxdepth 1 -type f | sort
```

Expected:

```text
rules/HIERARCHY PROTOCOL.md
rules/SYSTEM CORE.md
skills/api-bind.md
skills/find.md
skills/init-momory.md
skills/memo.md
skills/refactor-types.md
skills/refactor.md
skills/reg.md
skills/zod-gen.md
```

## Task 3: Add Cursor And Codex Metadata Shells

**Files:**
- Create: `.cursor-plugin/plugin.json`
- Create: `.codex/marketplace.json`

- [ ] **Step 1: Write the Cursor metadata shell**

Create `.cursor-plugin/plugin.json` with exactly:

```json
{
  "name": "wingman",
  "displayName": "Wingman",
  "description": "Enterprise-grade architectural workflow and memory system.",
  "version": "1.0.0",
  "skills": "../skills/",
  "rules": "../rules/"
}
```

- [ ] **Step 2: Write the Codex metadata shell**

Create `.codex/marketplace.json` with exactly:

```json
{
  "name": "wingman-marketplace",
  "plugins": [
    {
      "name": "wingman",
      "version": "1.0.0",
      "source": "../",
      "description": "Multi-platform AI engineering playbook."
    }
  ]
}
```

- [ ] **Step 3: Validate both JSON files parse successfully**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('.cursor-plugin/plugin.json','utf8')); JSON.parse(require('fs').readFileSync('.codex/marketplace.json','utf8')); console.log('json-ok')"
```

Expected:

```text
json-ok
```

## Task 4: Add Root Package Metadata

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create the root `package.json`**

Create `package.json` with exactly:

```json
{
  "name": "wingman",
  "version": "1.0.0",
  "private": false,
  "description": "Multi-platform AI engineering playbook for Cursor and Codex.",
  "license": "MIT",
  "keywords": [
    "ai",
    "agentic",
    "cursor",
    "codex",
    "prompt",
    "workflow",
    "plugin"
  ]
}
```

- [ ] **Step 2: Verify the package manifest is readable**

Run:

```bash
node -p "const pkg=require('./package.json'); [pkg.name,pkg.version,pkg.private].join(' | ')"
```

Expected:

```text
wingman | 1.0.0 | false
```

## Task 5: Rewrite Root README For Wingman

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the current README with cross-platform package documentation**

Write `README.md` with exactly:

```md
# Wingman

> Write once, run everywhere.

Wingman is a multi-platform AI engineering playbook packaged for both Cursor and Codex.

The repository is organized around one shared core:

- `skills/` contains reusable runtime skill prompts
- `rules/` contains shared system rule prompts
- `.cursor-plugin/plugin.json` is the Cursor metadata shell
- `.codex/marketplace.json` is the Codex metadata shell

## Principles

- One shared core for both platforms
- Platform differences isolated to metadata shells
- No duplicated prompt logic across wrappers
- Repository root acts as the publishable plugin package

## Directory Layout

```text
.
├── .cursor-plugin/
├── .codex/
├── skills/
├── rules/
├── package.json
└── README.md
```

## Included Skills

- `/api-bind`
- `/find`
- `/init`
- `/memo`
- `/refactor`
- `/refactor-types`
- `/reg`
- `/zod-gen`

## Included Rules

- `SYSTEM CORE`
- `HIERARCHY PROTOCOL`

## Packaging Model

Wingman keeps prompt logic in the shared core and uses lightweight metadata wrappers for platform integration.

Today, Cursor and Codex both load the same `skills/` and `rules/`.
If platform-specific divergence is needed later, the wrappers can change their references without rewriting the shared core.

## License

MIT
```

- [ ] **Step 2: Verify the README now identifies the package as `wingman`**

Run:

```bash
rg -n "Wingman|Cursor and Codex|skills/|rules/" README.md
```

Expected:

```text
At least one match for each of: Wingman, Cursor and Codex, skills/, rules/
```

## Task 6: Prune Non-Runtime Files And Remove Legacy Directories

**Files:**
- Delete: `example/activeContext.md`
- Delete: `example/`
- Delete: `commands/api-bind.zh.md`
- Delete: `commands/init-momory.zh.md`
- Delete: `commands/init-momory.readme.md`
- Delete: `commands/init-momory-buff.md`
- Delete: `commands/memo.zh.md`
- Delete: `commands/refactor-types.zh.md`
- Delete: `commands/refactor.zh.md`
- Delete: `commands/`
- Delete: `user-rules/`

- [ ] **Step 1: Delete the non-runtime derivative files left in `commands/`**

Run:

```bash
rm -f commands/api-bind.zh.md
rm -f commands/init-momory.zh.md
rm -f commands/init-momory.readme.md
rm -f commands/init-momory-buff.md
rm -f commands/memo.zh.md
rm -f commands/refactor-types.zh.md
rm -f commands/refactor.zh.md
```

Expected:

```text
Command exits with status 0 and removes the listed derivative files.
```

- [ ] **Step 2: Delete the example directory**

Run:

```bash
rm -rf example
```

Expected:

```text
The example directory no longer exists.
```

- [ ] **Step 3: Remove the now-empty legacy directories**

Run:

```bash
rmdir commands
rmdir user-rules
```

Expected:

```text
Both directories are removed without error because all target files were already moved or deleted.
```

## Task 7: Verify Final Package State

**Files:**
- Verify: `.cursor-plugin/plugin.json`
- Verify: `.codex/marketplace.json`
- Verify: `package.json`
- Verify: `README.md`
- Verify: `skills/`
- Verify: `rules/`

- [ ] **Step 1: Confirm the final file inventory**

Run:

```bash
rg --files | sort
```

Expected:

```text
.codex/marketplace.json
.cursor-plugin/plugin.json
LICENSE
README.md
docs/superpowers/plans/2026-04-23-wingman-plugin-architecture-implementation.md
docs/superpowers/specs/2026-04-23-wingman-plugin-architecture-design.md
package.json
rules/HIERARCHY PROTOCOL.md
rules/SYSTEM CORE.md
skills/api-bind.md
skills/find.md
skills/init-momory.md
skills/memo.md
skills/refactor-types.md
skills/refactor.md
skills/reg.md
skills/zod-gen.md
模型生态选型报告.md
```

- [ ] **Step 2: Confirm legacy directories are gone**

Run:

```bash
test ! -d commands && test ! -d user-rules && test ! -d example && echo "legacy-removed"
```

Expected:

```text
legacy-removed
```

- [ ] **Step 3: Confirm shell metadata points to the shared core**

Run:

```bash
node -e "const cursor=require('./.cursor-plugin/plugin.json'); const codex=require('./.codex/marketplace.json'); if(cursor.skills!=='../skills/'||cursor.rules!=='../rules/'||codex.plugins[0].source!=='../'){process.exit(1)} console.log('metadata-ok')"
```

Expected:

```text
metadata-ok
```

- [ ] **Step 4: Confirm the worktree contents before handing back**

Run:

```bash
git status --short
```

Expected:

```text
Shows the created and modified plugin-package files without any unexpected deletions outside the planned migration scope.
```

## Self-Review

### Spec Coverage

- Shared core split into `skills/` and `rules/`: covered by Task 2.
- Cursor and Codex wrapper metadata: covered by Task 3.
- Root `package.json`: covered by Task 4.
- Root `README.md` repositioned to `wingman`: covered by Task 5.
- Pruning of `example/`, derivative command files, `commands/`, and `user-rules/`: covered by Task 6.
- Final structure and metadata verification: covered by Task 7.

### Placeholder Scan

The plan contains no deferred implementation placeholders. Every created file includes explicit target content or exact commands.

### Type And Naming Consistency

- Package name is consistently `wingman`.
- Cursor shell file is consistently `.cursor-plugin/plugin.json`.
- Codex shell file is consistently `.codex/marketplace.json`.
- Shared core paths are consistently `skills/` and `rules/`.
- The normalized rule filename is consistently `rules/SYSTEM CORE.md`.
