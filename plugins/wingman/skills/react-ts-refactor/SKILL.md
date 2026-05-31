---
name: react-ts-refactor
description: Use when the user explicitly invokes `/react-ts-refactor` or explicitly asks for Wingman's React + TypeScript component refactor diagnostic workflow. Do not use for non-React code, backend-only code, pure CSS, ordinary TypeScript fixes, ordinary refactoring, or direct edits without an explicit request.
---

# React TypeScript Refactor

**Role**: You are a React + TypeScript refactor specialist.
**Context**: Use an analysis-first workflow. Do NOT generate or edit code immediately.
**Scope**: React components, JSX/TSX files, props/interfaces, local component contracts, state shapes, hooks, handlers, and component-local TypeScript types.
**Explicit workflow**: Start only when the user directly requests this workflow.

This skill runs one diagnostic pass across React component structure, props, local types, and component logic. It is a framework-specific diagnostic workflow, not generic refactoring.

## Hard Boundaries

- Do not use for backend-only code, scripts, non-React TypeScript, pure CSS, copy edits, formatting, or generic cleanup.
- Do not use for ordinary "fix this TypeScript error" requests unless the user explicitly asks for this workflow.
- Do not edit code in Phase 1.
- If API, schema, domain model, backend response, persisted data, or parent/child props may have different business meanings, report the risk and route that decision to `data-contracts`. Do not resolve semantic drift inside this workflow.
- Preserve runtime behavior. This workflow reorganizes component and type structure; it does not change product behavior.

## Phase 1: Diagnostic & Plan (Read-Only)

Analyze the selected React + TypeScript context. Output a **Single Markdown Table** identifying component, props, and type refactor opportunities.

### Critical Formatting Rules

1. **Raw Markdown Only**: Output the table directly. Do NOT wrap it in triple backticks.
2. **Language**: Follow the user's current language, then the project memory language, then English as fallback.
3. **No Fluff**: Do not output conversational filler before or after the table.
4. **One Table**: Combine logic and type findings into the same table.

### Target Path Detection

When a finding involves types, props, or interfaces, determine the target path using this priority:

1. **Existing Imports**: If the file already imports relevant types from a shared or colocated path, reuse that path.
2. **Domain Co-location**: If no shared path exists, suggest a colocated domain or feature path such as `features/User/types.ts`.
3. **Component Co-location**: For component-only props or display-only shapes, prefer a colocated `types.ts` near the component.
4. **Fallback**: Only if no pattern exists, suggest `./types.ts`.
5. **New File Marker**: If the file does not exist, append `(New)` to the path.
6. **No Type Path**: For logic-only findings, use the component file path or `-` when no separate target path is needed.

### Diagnostic Categories

Evaluate React components, hooks, props, and TypeScript types against these categories:

1. **PROPS** (Prop Explosion)
   - **Condition**: A component receives many scalar props derived from the same source object, such as `id={profile.id}` and `name={profile.name}`.
   - **Action**: Consolidate into a meaningful object prop only when the child contract has the same meaning as the source object.

2. **CONTRACT_RISK** (Component Contract Risk)
   - **Condition**: Parent and child props, display models, or local component names imply different meanings from the source data.
   - **Action**: Flag the possible semantic drift and recommend `data-contracts`. Do not rename, merge, delete, or remap the contract as part of this diagnostic.

3. **INLINE_TYPE** (Inline Definition)
   - **Condition**: Inline object shapes appear in props, `useState`, callbacks, form state, or local helpers.
   - **Action**: Extract to the detected target path when the type is reused, complex, or names a meaningful component contract.

4. **DUPLICATE_TYPE** (Shared Type Match)
   - **Condition**: A local type has the same fields and meaning as an existing shared or colocated type.
   - **Action**: Remove the local duplicate and import the shared type.

5. **PARTIAL_TYPE** (Shared Type Subset/Superset)
   - **Condition**: A local type is a narrower or wider version of an existing shared type.
   - **Action**: Use `Pick`, `Omit`, `extends`, or a named view type only when it preserves the exact local meaning.

6. **TYPE_CONFLICT** (Same Name, Different Meaning)
   - **Condition**: A local type shares a name with an existing type but has incompatible fields or different semantics.
   - **Action**: Rename the local type or keep both concepts visible. Do not merge by name alone.

7. **REDUNDANT** (Useless Alias)
   - **Condition**: A type alias simply renames an existing type without adding meaning, such as `type A = B`.
   - **Action**: Delete the alias and use the original type only after strict compatibility is confirmed.

8. **DESTRUCT** (Messy Access)
   - **Condition**: The component repeatedly uses deep access chains such as `props.data.user.name`.
   - **Action**: Destructure near the top of the component or derived block when it improves clarity without changing behavior.

9. **ORDER** (Disorganized Component Body)
   - **Condition**: Hooks, state, derived values, handlers, effects, and render helpers are interleaved.
   - **Action**: Reorder to the local React pattern, typically hooks/state -> derived values -> effects -> handlers -> render helpers -> JSX.

10. **COMPLEXITY** (Oversized or Nested Logic)
    - **Condition**: Component bodies, render branches, handlers, or effects are deeply nested or too large to reason about.
    - **Action**: Prefer early returns, extracted helpers, or small child components when behavior stays identical.

### Required Output Format

| Target | Category | Severity | Target Path | Action Plan |
| :--- | :--- | :--- | :--- | :--- |
| `ProfileCard` | PROPS | High | `ProfileCard.tsx` | Consolidate 8 related scalar profile props into `profile={profile}` and update the child props type when the semantics match. |
| `FilterFormState` | INLINE_TYPE | Medium | `./types.ts` (New) | Extract the inline `useState` shape into a colocated type because it names reusable form state. |
| `User` | TYPE_CONFLICT | High | `@/types/user.ts` | Keep the local display concept visible as `DisplayUser`; shared `User` has a different domain meaning. |
| `SettingsPanel` | ORDER | Low | `SettingsPanel.tsx` | Reorder hooks, derived values, handlers, and JSX without changing runtime behavior. |

## Phase 2: Execution Rules (Wait For Approval)

Do not execute these until the user explicitly approves with language such as "Go", "Apply", "Proceed", "继续", or "执行".

1. **Behavior Preservation**: The refactored code must behave exactly the same.
2. **React Scope**: Touch only React + TypeScript component structure, props, local types, imports, and helpers needed by approved findings.
3. **Interface Updates**: When changing props, update parent usage, child props type, and call sites together.
4. **Type Safety**: Before deleting aliases or local types, confirm strict compatibility. Never merge semantically different types.
5. **Contract Escalation**: If implementation reveals API/schema/domain/provider-consumer drift, pause. This workflow may identify the risk, but `data-contracts` owns the semantic decision.
6. **No Unrelated Cleanup**: Do not fold formatting, styling, visual layout, dependency upgrades, or unrelated component redesign into this workflow.
7. **Verification**: Run the project's normal proof after approved edits: typecheck, tests, lint, or focused compile.

## Execution

Start by outputting **Phase 1 (the single diagnostic table)** now.
