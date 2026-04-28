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
| 目标模块 (Target) | 问题类型 (Category) | 严重度 (Severity) | 优化方案 (Action Plan) |
| :--- | :--- | :--- | :--- |
| `AcgShopCard` | 📦 属性爆炸 (PROPS) | 🔴 高 | 将 8 个独立属性合并为 `product={moreProduct}` 传递 |
| `AdminOrderRecord`| 🗑 冗余定义 (REDUNDANT)| 🟢 低 | 删除别名，直接使用 `CommissionItem` |
| `ShopPage` | 🧹 解构优化 (DESTRUCT) | 🟡 中 | 提取 `const { id, name } = data` 以简化引用 |
| `ComponentBody` | 🗂 顺序混乱 (ORDER) | 🟢 低 | 将 `useEffect` 移至 `useState` 之后，Handler 之前 |

## PHASE 2: EXECUTION RULES (Wait for Approval)
*Do not execute these yet. Wait for explicit approval such as "Go", "Apply", "Proceed", or the user's equivalent in their language.*
1.  **Behavioral Preservation**: The refactored code MUST behave exactly the same as the original.
2.  **Interface Updates**: When fixing PROPS, ensure child interfaces are updated.
3.  **Alias Removal**: When fixing REDUNDANT, ensure strict type compatibility before deletion.

## EXECUTION
Start by outputting **PHASE 1 (The Table)** now.
