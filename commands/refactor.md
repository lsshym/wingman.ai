---
name: refactor
description: Start an interactive logic refactor workflow. Use when reviewing structure first and applying code cleanup only after a diagnostic table is approved.
---

# Interactive Logic Refactoring (Table Mode V4 - Structure & Cleanup)

**Role**: You are a Clean Code Specialist.
**Context**: Use an analysis-first workflow. Do NOT generate or edit code immediately.

## PHASE 1: DIAGNOSTIC & PLAN (Read-Only)
Analyze the context. Output a **Single Markdown Table** identifying code smells.

### 🛑 CRITICAL FORMATTING RULES
1.  **Raw Markdown Only**: Output the table directly. **Do NOT** wrap it in triple backticks (` ``` `).
2.  **Language**: Follow the user's current language, then the project memory language, then English as fallback.
3.  **No Fluff**: Do not output conversational filler. Just the table.

### 🔍 Analysis Logic (Code Smells)
Evaluate functions, components, and logic blocks against these criteria:

1.  **PROPS** (Prop Explosion) - *High Priority*
    * *Condition*: Component receives many individual props derived from the same source object (e.g., `id={o.id} name={o.name}`).
    * *Action*: Consolidate into a single object prop (e.g., `data={o}`) and update the child interface.
2.  **REDUNDANT** (Useless Aliasing) - *User Request*
    * *Condition*: Type aliases that simply rename an existing type without adding value (e.g., `type A = B;`).
    * *Action*: **Delete the alias** and replace all usages with the original type name to reduce code volume.
3.  **DESTRUCT** (Messy Access)
    * *Condition*: Repeated deep access chains (e.g., `props.data.user.name` used multiple times).
    * *Action*: Destructure at the top level (`const { user } = props.data`).
4.  **ORDER** (Disorganized)
    * *Condition*: Mixed code order (e.g., Hooks, Handlers, and Variables interleaved).
    * *Action*: Reorder to standard structure: 1. Hooks/State -> 2. Derived Vars -> 3. Handlers -> 4. Render.
5.  **COMPLEXITY** (Logic Nesting)
    * *Condition*: Deep nesting (`if/else`) or huge function bodies.
    * *Action*: Extract Method / Early Return.

### 📊 Required Output Format (Example)
| Target | Category | Severity | Action Plan |
| :--- | :--- | :--- | :--- |
| `ProductCard` | PROPS | High | Consolidate 8 related scalar props into `product={product}` and update the child interface. |
| `OrderRecord` | REDUNDANT | Low | Remove the alias and use `CommissionItem` directly when strict type compatibility is confirmed. |
| `ShopPage` | DESTRUCT | Medium | Extract `const { id, name } = data` to simplify repeated access. |
| `ComponentBody` | ORDER | Low | Move hooks/state before derived values, handlers, and render logic. |

## PHASE 2: EXECUTION RULES (Wait for Approval)
*Do not execute these yet. Wait for explicit approval such as "Go", "Apply", "Proceed", or the user's equivalent in their language.*
1.  **Behavioral Preservation**: The refactored code MUST behave exactly the same as the original.
2.  **Interface Updates**: When fixing PROPS, ensure child interfaces are updated.
3.  **Alias Removal**: When fixing REDUNDANT, ensure strict type compatibility before deletion.

## EXECUTION
Start by outputting **PHASE 1 (The Table)** now.
