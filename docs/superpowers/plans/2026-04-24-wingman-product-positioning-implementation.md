# Wingman Product Positioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align `wingman`'s public naming, frontmatter metadata, README structure, and content audit with the approved cross-platform product positioning.

**Architecture:** Keep the repository as one shared content core with thin platform wrappers. Implement the approved product language in layers: first rename the memory workflow entrypoints, then upgrade frontmatter discoverability copy, then reorganize README around the three capability groups, and finally document platform-specific leakage without rewriting core strategy bodies.

**Tech Stack:** Markdown, YAML frontmatter, JSON metadata, shell verification, ripgrep

---

Current user preference: do not create commits during execution unless explicitly requested. This plan therefore omits commit steps.

## File Map

### Files To Create

- `docs/superpowers/specs/2026-04-24-wingman-platform-semantics-audit.md`
  Purpose: inventory shared-intent versus platform-specific assumptions in the current content layer.

### Files To Move

- `skills/init/SKILL.md` -> `skills/memory-setup/SKILL.md`
- `commands/memo.md` -> `commands/memory-sync.md`

### Files To Modify

- `README.md`
- `skills/memory-setup/SKILL.md`
- `commands/memory-sync.md`
- `skills/api-bind/SKILL.md`
- `skills/find/SKILL.md`
- `skills/reg/SKILL.md`
- `skills/zod-gen/SKILL.md`
- `commands/refactor.md`
- `commands/refactor-types.md`
- `rules/system-core.mdc`
- `rules/hierarchy.mdc`
- `.cursor-plugin/plugin.json`
- `.codex/marketplace.json`
- `package.json`
- `docs/superpowers/specs/2026-04-24-wingman-product-positioning-design.md`
- `docs/superpowers/specs/2026-04-24-wingman-cursor-native-skills-upgrade-design.md`

### Files To Leave Functionally Untouched

- the core strategy bodies under `skills/` and `commands/`, except for public naming replacements and minimal wrapper text updates required by the approved design

## Task 1: Rename The Memory Workflow Entrypoints

**Files:**
- Move: `skills/init/SKILL.md` -> `skills/memory-setup/SKILL.md`
- Move: `commands/memo.md` -> `commands/memory-sync.md`
- Modify: `skills/memory-setup/SKILL.md`
- Modify: `commands/memory-sync.md`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-04-24-wingman-product-positioning-design.md`
- Modify: `docs/superpowers/specs/2026-04-24-wingman-cursor-native-skills-upgrade-design.md`

- [ ] **Step 1: Capture the baseline naming inventory**

Run:

```bash
rg -n "/init|/memo|name: init|name: memo|skills/init|commands/memo" README.md skills commands docs/superpowers/specs
```

Expected:

```text
Matches show the current public memory workflow names and file paths.
```

- [ ] **Step 2: Move the files to their new public identities**

Run:

```bash
mv skills/init skills/memory-setup
mv commands/memo.md commands/memory-sync.md
```

Expected:

```text
The `skills/memory-setup/` directory exists and `commands/memory-sync.md` exists.
```

- [ ] **Step 3: Update the memory setup skill frontmatter and public trigger language**

Apply this frontmatter at the top of `skills/memory-setup/SKILL.md`:

```md
---
name: memory-setup
description: Initialize the project memory workflow. Use when a repository needs durable context for long-running or collaborative work.
---
```

Inside the body, replace only the public trigger wording:

```md
Triggered when the user types `/memory-setup`.
```

and:

```md
Do NOT wait for the user to say `/memory-sync`.
```

- [ ] **Step 4: Update the memory sync command frontmatter and public trigger language**

Apply this frontmatter at the top of `commands/memory-sync.md`:

```md
---
name: memory-sync
description: Sync progress, decisions, or new records into the memory workflow. Use when users want to manually refresh project memory.
---
```

Inside the body, replace only the public trigger wording:

```md
Parse input: `/memory-sync [text]`.
- Case A: `/memory-sync` (No extra text) -> Analyze current chat session for core changes.
- Case B: `/memory-sync [text]` -> Focus specifically on the instruction in `[text]`.
```

and update any references to `"/memo"` to `"/memory-sync"` where they describe the public entrypoint rather than historical commentary.

- [ ] **Step 5: Update documentation references to the renamed entrypoints**

Update these references:

```md
/init -> /memory-setup
/memo -> /memory-sync
skills/init/SKILL.md -> skills/memory-setup/SKILL.md
commands/memo.md -> commands/memory-sync.md
```

Apply this to:

- `README.md`
- `docs/superpowers/specs/2026-04-24-wingman-product-positioning-design.md`
- `docs/superpowers/specs/2026-04-24-wingman-cursor-native-skills-upgrade-design.md`

- [ ] **Step 6: Verify that the old public names are no longer primary entrypoints**

Run:

```bash
rg -n "/init|/memo|name: init|name: memo|skills/init|commands/memo" README.md skills commands docs/superpowers/specs
```

Expected:

```text
No matches for active public entrypoints. Historical mention is acceptable only if clearly marked as previous naming.
```

## Task 2: Rewrite Frontmatter For Product-Grade Discoverability

**Files:**
- Modify: `skills/api-bind/SKILL.md`
- Modify: `skills/find/SKILL.md`
- Modify: `skills/reg/SKILL.md`
- Modify: `skills/zod-gen/SKILL.md`
- Modify: `commands/refactor.md`
- Modify: `commands/refactor-types.md`
- Modify: `rules/system-core.mdc`
- Modify: `rules/hierarchy.mdc`

- [ ] **Step 1: Capture the current frontmatter descriptions**

Run:

```bash
for f in skills/*/SKILL.md commands/*.md rules/*.mdc; do
  echo "FILE:$f"
  sed -n '1,6p' "$f"
done
```

Expected:

```text
Each file prints its current frontmatter for review.
```

- [ ] **Step 2: Replace skill descriptions with intent-driven product copy**

Use these exact descriptions:

```md
skills/api-bind/SKILL.md
description: Bind backend payloads to existing UI components without adapter drift. Use when integrating API responses, field mappings, or backend-to-UI contracts.

skills/find/SKILL.md
description: Find existing reusable assets in the project registry. Use when searching for similar components, utilities, or prior implementations before building new ones.

skills/reg/SKILL.md
description: Register reusable project assets into the project registry. Use when cataloging components, hooks, or utilities for later reuse.

skills/zod-gen/SKILL.md
description: Generate strict Zod schemas for backend data contracts. Use when validating API payloads, transforming response shapes, or inferring TypeScript types.
```

- [ ] **Step 3: Replace command descriptions with intent-driven product copy**

Use these exact descriptions:

```md
commands/refactor.md
description: Start an interactive logic refactor workflow. Use when reviewing structure first and applying code cleanup only after a diagnostic table is approved.

commands/refactor-types.md
description: Start an interactive type refactor workflow. Use when separating types from logic and deciding target paths before making code changes.

commands/memory-sync.md
description: Sync progress, decisions, or new records into the memory workflow. Use when users want to manually refresh project memory.
```

- [ ] **Step 4: Tighten the rule descriptions without changing rule behavior**

Use these exact descriptions:

```md
rules/system-core.mdc
description: Global engineering behavior for concise output, surgical edits, and high-value implementation focus.

rules/hierarchy.mdc
description: Fallback precedence rule that yields to project-specific rule files when they exist.
```

- [ ] **Step 5: Verify that every description follows the “what it does / when to use” pattern**

Run:

```bash
for f in skills/*/SKILL.md commands/*.md rules/*.mdc; do
  echo "FILE:$f"
  sed -n '1,5p' "$f"
done
```

Expected:

```text
All skills and commands have clearer outcome-plus-usage descriptions; rules remain concise behavior descriptions.
```

## Task 3: Rebuild README Around The Three Capability Groups

**Files:**
- Modify: `README.md`
- Modify: `.cursor-plugin/plugin.json`
- Modify: `.codex/marketplace.json`
- Modify: `package.json`

- [ ] **Step 1: Capture the current README capability sections**

Run:

```bash
rg -n "Included Skills|Included Commands|Included Rules|Packaging Model|Public Entry Names" README.md
```

Expected:

```text
Current section anchors are listed for replacement.
```

- [ ] **Step 2: Rewrite the opening and capability overview**

Replace the opening concept with this shape:

```md
# Wingman

> A cross-platform AI engineering plugin for execution, context, and reuse.

Wingman packages one shared content core for practical engineering execution, advanced context workflows, and reusable project asset lookup across multiple AI coding platforms.
```

- [ ] **Step 3: Replace the flat command lists with three grouped sections**

Use this grouping:

```md
## Core Engineering
- `/api-bind`
- `/zod-gen`
- `/refactor`
- `/refactor-types`

## Advanced Context
- `/memory-setup`
- `/memory-sync`

Best for repositories with longer timelines, collaborative work, or codebases where durable context matters.

## Project Registry
- `/reg`
- `/find`
```

- [ ] **Step 4: Rewrite the packaging explanation to match the shared-core narrative**

Use this shape:

```md
Wingman keeps one shared content core at the repository root:
- `rules/`
- `skills/`
- `commands/`

Platform wrappers stay thin:
- `.cursor-plugin/plugin.json`
- `.codex/marketplace.json`
```

and add one explicit expectation line:

```md
Cross-platform means shared content and aligned public capability names, not guaranteed identical runtime behavior on every platform.
```

- [ ] **Step 5: Align the package descriptions with the README opening**

Update the description fields in:

- `.cursor-plugin/plugin.json`
- `.codex/marketplace.json`
- `package.json`

to use this core wording:

```text
Cross-platform AI engineering plugin for execution, context, and reuse.
```

- [ ] **Step 6: Verify the README now reflects the approved information architecture**

Run:

```bash
rg -n "Core Engineering|Advanced Context|Project Registry|memory-setup|memory-sync|execution, context, and reuse|Cross-platform means" README.md
```

Expected:

```text
Each new grouped section and the expectation-management line are present.
```

## Task 4: Document Platform-Specific Leakage Without Rewriting Core Strategy Bodies

**Files:**
- Create: `docs/superpowers/specs/2026-04-24-wingman-platform-semantics-audit.md`
- Read: `skills/*/SKILL.md`
- Read: `commands/*.md`
- Read: `rules/*.mdc`

- [ ] **Step 1: Inventory the shared-intent versus platform-specific signals**

Run:

```bash
rg -n "\\.cursor/|Cursor|Plan Mode|active file|editor|\\.cursorrules|\\.mdc" skills commands rules
```

Expected:

```text
Matches identify where platform-specific language still leaks into the shared core.
```

- [ ] **Step 2: Write the audit document with one section per capability file**

Create `docs/superpowers/specs/2026-04-24-wingman-platform-semantics-audit.md` with this template:

```md
# Wingman Platform Semantics Audit

## Purpose
Track which instructions belong to the shared intent layer and which remain platform-specific.

## File: skills/api-bind/SKILL.md
- Shared intent:
- Platform semantics:
- Recommended next action:

## File: skills/memory-setup/SKILL.md
- Shared intent:
- Platform semantics:
- Recommended next action:
```

Include entries for every file under:

- `skills/*/SKILL.md`
- `commands/*.md`
- `rules/*.mdc`

- [ ] **Step 3: Classify each file using the same three fields**

For every file, fill:

```md
- Shared intent: the task goal, decision logic, or output contract that should remain platform-neutral.
- Platform semantics: editor assumptions, path conventions, or platform-specific trigger language.
- Recommended next action: keep as-is, wrapper-only cleanup, or deeper rewrite later.
```

- [ ] **Step 4: Verify the audit covers every current capability file**

Run:

```bash
find skills commands rules -maxdepth 2 -type f | sort
rg -n "^## File:" docs/superpowers/specs/2026-04-24-wingman-platform-semantics-audit.md
```

Expected:

```text
The audit contains one `## File:` section for every current skill, command, and rule file.
```

## Task 5: Final Verification Pass

**Files:**
- Verify: `README.md`
- Verify: `skills/memory-setup/SKILL.md`
- Verify: `commands/memory-sync.md`
- Verify: `skills/*/SKILL.md`
- Verify: `commands/*.md`
- Verify: `rules/*.mdc`
- Verify: `docs/superpowers/specs/2026-04-24-wingman-platform-semantics-audit.md`

- [ ] **Step 1: Verify the final file inventory**

Run:

```bash
find skills commands rules docs/superpowers/specs -maxdepth 2 -type f | sort
```

Expected:

```text
The moved memory files exist under their new names and the new audit spec exists.
```

- [ ] **Step 2: Verify all frontmatter-bearing files still start with YAML frontmatter**

Run:

```bash
for f in skills/*/SKILL.md commands/*.md rules/*.mdc; do
  first=$(sed -n '1p' "$f")
  if [ "$first" != "---" ]; then
    echo "missing-frontmatter:$f"
    exit 1
  fi
done
echo frontmatter-ok
```

Expected:

```text
frontmatter-ok
```

- [ ] **Step 3: Verify the new public memory names appear and the old ones do not**

Run:

```bash
rg -n "memory-setup|memory-sync" README.md skills commands docs/superpowers/specs
rg -n "/init|/memo|name: init|name: memo" README.md skills commands docs/superpowers/specs
```

Expected:

```text
The first command finds the new names.
The second command returns no active public-entry matches.
```

- [ ] **Step 4: Verify JSON metadata still parses**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('.cursor-plugin/plugin.json','utf8')); JSON.parse(require('fs').readFileSync('.codex/marketplace.json','utf8')); JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('json-ok')"
```

Expected:

```text
json-ok
```

- [ ] **Step 5: Verify the worktree before handing back**

Run:

```bash
git status --short
```

Expected:

```text
Shows the planned documentation and content-layer changes only, without unrelated reversions.
```

## Self-Review

### Spec Coverage

- Public command naming cleanup: covered by Task 1.
- Product-grade frontmatter descriptions: covered by Task 2.
- README regrouping around the three-layer capability model: covered by Task 3.
- Platform semantics inventory without body rewrites: covered by Task 4.
- Final structural and metadata verification: covered by Task 5.

### Placeholder Scan

This plan contains no deferred placeholders such as "TBD" or "implement later". Every task lists the exact files, target wording, or verification commands needed to execute the step.

### Type And Naming Consistency

- The approved memory workflow names are consistently `memory-setup` and `memory-sync`.
- The capability grouping is consistently `Core Engineering`, `Advanced Context`, and `Project Registry`.
- The cross-platform product description is consistently "execution, context, and reuse."
