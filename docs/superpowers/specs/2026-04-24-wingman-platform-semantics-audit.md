# Wingman Platform Semantics Audit

## Purpose
Track which instructions belong to the shared intent layer and which remain platform-specific.

## Taxonomy (How To Classify)
- Platform semantics: Any instruction that assumes a specific host platform or integration surface, including editor features (active file/selection, “Plan Mode”), on-disk conventions (e.g., `.cursor/...`), rule-loader formats (e.g., `.mdc` frontmatter), and command-entry wiring (`/command` triggers).
- For this audit, wrapper/entrypoint behavior (slash-command surface, wrapper-managed output-language policy, wrapper-level trigger conventions) is treated as platform semantics.
- Shared behavioral policy: General agent behavior expectations (be concise, do not overwrite files, require approval before execution) that are valid across platforms. These should not be treated as “platform semantics” even if currently encoded in a platform-specific file format.
- Framework/runtime assumptions: Assumptions about the target code ecosystem (TypeScript, React/JSX, Zod) are neither “platform semantics” nor “shared policy” by default. Treat them as “domain/runtime scope”:
  - OK when the capability is intentionally scoped to that runtime (e.g., a Zod generator).
  - Not OK when they are accidental or unnecessarily exclude other runtimes (flag for later generalization).

## File: commands/memory-sync.md
- Shared intent: Dispatch a structured “memory update” workflow: parse user intent, enforce a value-funnel gate, write a durable progress log, and optionally distill durable knowledge after logging.
- Platform semantics: Hard-codes Cursor memory-bank paths (`.cursor/skills/...`, `.cursor/memory/...`, `.cursor/brain/...`) and assumes a platform that can open/edit those files directly; command-style trigger syntax (`/memory-sync [text]`) is platform wrapper behavior.
- Recommended next action: Replace hard-coded `.cursor/...` paths with a single “memory root” variable and document it once at the top. Acceptance: the file contains no literal `.cursor/` paths outside that config block, and the workflow steps remain unchanged.

## File: commands/refactor-types.md
- Shared intent: Run a plan-first, table-only diagnostic for type refactors (separate types from logic) with conservative rules and path-detection heuristics.
- Platform semantics: Explicitly assumes Cursor by name (“Cursor's Plan Mode”) and relies on an editor-mode concept (“Plan Mode”) to gate code generation; otherwise content is platform-neutral.
- Recommended next action: Replace “Cursor's Plan Mode” with a platform-neutral gate (“Plan-first diagnostic mode: do not emit code until user says Go”). Acceptance: no “Cursor” or “Plan Mode” strings remain, and the command still enforces “table only” until approval.

## File: commands/refactor.md
- Shared intent: Run a plan-first, table-only diagnostic for logic refactors (identify smells, propose actions) and wait for explicit approval before generating code.
- Platform semantics: Explicitly assumes Cursor by name (“Cursor's Plan Mode”) and relies on an editor-mode concept (“Plan Mode”) to gate code generation; otherwise content is platform-neutral.
- Recommended next action: Replace “Cursor's Plan Mode” with a platform-neutral gate (“Plan-first diagnostic mode: do not emit code until user says Go”). Acceptance: no “Cursor” or “Plan Mode” strings remain, and the command still requires explicit approval before execution.

## File: rules/hierarchy.mdc
- Shared intent: Define precedence: project-local rules override global defaults; global rules apply only as fallback when not contradicted.
- Platform semantics: Mentions `.cursorrules` and `.mdc` specifically and assumes a rules engine that loads `.mdc` with frontmatter (`alwaysApply`) semantics (Cursor convention).
- Recommended next action: Keep as-is; add a one-line clarification that this rule defines precedence for Cursor rule loading. Acceptance: wording explicitly scopes the rule to Cursor’s `.cursorrules/.mdc` mechanism and does not claim general cross-platform precedence.

## File: rules/system-core.mdc
- Shared intent: Set global behavioral constraints for the agent (concise, surgical edits, avoid fluff; show diffs not full files; explain only non-obvious logic).
- Platform semantics: Uses `.mdc` and Cursor-style frontmatter (`alwaysApply: true`) implying a specific rules loader; the rest is general agent behavior.
- Recommended next action: Keep as-is; add one sentence stating “This is Cursor global defaults” to prevent over-generalization. Acceptance: the file self-identifies as Cursor-scoped while retaining the platform-neutral behavioral policy content.

## File: skills/api-bind/SKILL.md
- Shared intent: Bind backend payloads to UI components with a clear decision tree (simple aliasing vs direct use), resilience for missing fields, and a “conflict protocol” to avoid adapter drift by updating component interfaces instead of parent mappers.
- Platform semantics: None (editor/wrapper). Scope/runtime assumptions: intentionally scoped to React/JSX + TypeScript component integration; not a host-platform/editor dependency.
- Recommended next action: Add a one-line “Scope” note near the top clarifying this skill targets React/TS component code, not editor workflows. Acceptance: the file contains an explicit scope line and still has zero Cursor/editor/path references.

## File: skills/find/SKILL.md
- Shared intent: Given a requirement, search an existing registry of reusable assets, rank best matches, and return a small set of reuse candidates with usage hints in a strict output format.
- Platform semantics: Hard-codes Cursor registry locations (`.cursor/brain/*.md`) and command trigger semantics (`/find`, `/匹配`). Wrapper-managed output-language policy (e.g., “STRICTLY CHINESE”) is also platform semantics for this audit and should not be part of the shared intent.
- Recommended next action: Replace `.cursor/brain/*.md` references with a single “registry source” abstraction (config + read list), and remove “STRICTLY CHINESE” from the core procedure (defer language to wrapper rules). Acceptance: registry paths are not Cursor-specific, and the file contains no hard-coded language mandate in the algorithm steps.

## File: skills/memory-setup/SKILL.md
- Shared intent: Initialize a durable project memory workflow: create storage locations, establish routing/standards rules, seed a “project brief” domain index, seed an “active context” log, and define chained skills for logging and distillation with strict gates.
- Platform semantics: Entire workflow is Cursor-specific: writes to `.cursor/...` directories, generates `.mdc` rule files, references Cursor skill locations, and assumes the agent can create/edit files on disk “silently”; includes editor-centric operations (“Open ...”) and concrete Cursor path conventions.
- Recommended next action: Extract a platform-neutral “memory workflow contract” (directories/files + operations: init, log prepend, distill) into a new shared spec, and keep this file as the Cursor adapter that implements that contract. Acceptance: the shared spec contains no `.cursor/` paths, and this skill explicitly references the shared contract as its source of truth.

## File: skills/reg/SKILL.md
- Shared intent: Register a single component/utility into a reuse registry with strict safety gates: must read source, append-only writes, deduplicate by path, classify into one registry, and produce deterministic confirmation responses.
- Platform semantics: Assumes an editor concept of “active file” and hard-codes Cursor registry paths (`.cursor/brain/*.md`); command trigger syntax (`/reg`) is wrapper behavior.
- Recommended next action: Replace “active file in the editor” with an explicit input contract (“target path required unless host provides active-file binding”), and centralize registry file locations in a config block. Acceptance: the file no longer requires editor state to function, and all registry paths are defined in one place.

## File: skills/zod-gen/SKILL.md
- Shared intent: Generate strict Zod schemas for backend contracts: define raw input schema, transform/mapping layer, infer output types, and provide a usage example with clear constraints.
- Platform semantics: Minor editor assumption (“select code in editor”). Scope/runtime assumptions: intentionally scoped to TypeScript + Zod; not a host-platform/editor dependency beyond optional selection.
- Recommended next action: Replace “select code in editor” with a platform-neutral input contract (“user provides JSON payload; selection is optional host convenience”). Acceptance: the file has no required editor-selection dependency and states TS+Zod scope explicitly.
