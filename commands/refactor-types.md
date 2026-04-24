---
name: refactor-types
description: Start the interactive type refactor workflow with path-aware diagnostics before extracting or reorganizing types.
---

# Interactive Type Refactoring (Table Mode V5 - Path Aware)

**Role**: You are a TypeScript Architecture Specialist.
**Context**: I am using Cursor's "Plan Mode". Do NOT generate code immediately.
**Task**: Refactor the selected code to separate Types from Logic, utilizing a structured diagnostic table with intelligent path detection.

## PHASE 1: DIAGNOSTIC & PLAN (Read-Only)
Analyze the context. Output a **Single Markdown Table** summarizing your findings.

### 🛑 CRITICAL FORMATTING RULES
1.  **Raw Markdown Only**: Output the table directly. **Do NOT** wrap it in triple backticks (` ``` `) or code blocks.
2.  **Language**: Use **Chinese** for the content of the table (Status, Evidence, Action Plan).
3.  **No Fluff**: Do not output conversational filler. Just the table.

### 🧠 Intelligent Path Detection (Target Sniffing)
When determining where to extract/find types, strictly follow this priority:
1.  **Existing Imports**: If the file already imports types (e.g., from `@/types/user` or `./models`), reuse that path.
2.  **Domain Co-location**: If no global import exists, suggest a domain-specific file (e.g., inside `features/User/types.ts`).
3.  **Fallback**: Only if no pattern is found, suggest a generic `types.ts`.
4.  **Constraint**: Always list the determined path in the table. If the file does not exist, append `(New)` to the path.

### 🔍 Analysis Logic & Mapping
Evaluate each type/interface against the codebase and map it to the **Status** column strictly:

1.  **Logic: MATCH** (Perfect Match)
    * *Condition*: Local type has exact fields as Shared Type.
    * *Output Status*: **✅ 完美匹配**
    * *Action*: Merge and import from shared.
2.  **Logic: EXTRACT** (Inline Definition)
    * *Condition*: Code uses inline types (e.g., inside `useState`, `props`, or `zod` schemas).
    * *Output Status*: **📦 内联定义**
    * *Action*: Extract to the detected Target Path.
3.  **Logic: PARTIAL** (Superset/Subset)
    * *Condition*: Local type extends or narrows a Shared Type.
    * *Output Status*: **🔗 部分复用**
    * *Action*: Use `Pick`, `Omit`, or `extends`.
4.  **Logic: CONFLICT** (Hard Conflict)
    * *Condition*: Same name but incompatible types/meanings.
    * *Output Status*: **🛑 命名冲突**
    * *Action*: Rename Local type (e.g., prefix with Component name).
5.  **Logic: SAFE** (Ignored)
    * *Condition*: Standard types (`Record`, `string`) or already valid imports.
    * *Output Status*: **⚪️ 无需处理**
    * *Action*: Ignore.

### 📊 Required Output Format (Example)
| 类型名称 (Type) | 状态 (Status) | 📂 目标路径 (Target Path) | 执行计划 (Action Plan) |
| :--- | :--- | :--- | :--- |
| `GoalItem` | ✅ 完美匹配 | `@/types/goal.ts` | 删除本地定义，引入该路径 |
| `PlanInfo` | 📦 内联定义 | `./models.ts` (New) | 提取并创建新文件 |
| `User` | 🛑 命名冲突 | `@/models/user.ts` | 修改本地名称为 `LocalUser` |
| `Record` | ⚪️ 无需处理 | - | TS 原生类型，跳过 |

## PHASE 2: EXECUTION RULES (Wait for Approval)
*Do not execute these yet. Wait for my "Go" command.*
1.  **Conservative Stitching**: Never blindly overwrite a conflict. Always use TypeScript Utility Types to preserve the exact shape of the local type.
2.  **Zero Logic Drift**: Do not optimize, reorder, or rename variables in the runtime logic. Only touch `interface`, `type`, and `import`.
3.  **Path Verification**: If the user rejects the proposed `Target Path` in Phase 1, ask for the correct path before generating code.

## EXECUTION
Start by outputting **PHASE 1 (The Table)** now.
