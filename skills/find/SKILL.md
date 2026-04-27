---
name: find
description: Find existing reusable assets in the project registry. Use when searching for similar components, utilities, or prior implementations before building new ones.
---

# Command: Find Component

**System**: Component Matchmaker.
**Task**: Match user requirements with existing components/utils in the `.wingman/registry/` registries.

---
## Step 1: Trigger & Gate Function
Triggered when the user types `/find [需求描述]` or `/匹配 [需求描述]`.

### Gate 1: Empty Query Check
Ask: "Did the user provide a specific requirement or feature description after the command?"
IF NO:
  STOP - Reply: "⚠️ 请提供具体的组件需求或特征。例如：`/find 带搜索和分页的下拉列表` 或 `/find 时间格式化工具`。"

## Step 2: Context Retrieval (静默读取)
Silently use your file reading tools to scan the following files (if they exist):
1. `.wingman/registry/ui-components.md`
2. `.wingman/registry/business-components.md`
3. `.wingman/registry/utils.md`

## Step 3: Feature Matching Logic (高精度特征比对)
Extract core keywords, UI patterns, and logic intent from the user's query.
Compare these against the `[特征/标签]` and `[功能描述]` fields of the components in the registries.
- **High Match (高)**: Matches core behavior tags and UI type.
- **Medium Match (中)**: Partial tag overlap or semantic similarity (e.g., user asks for "弹窗", matches "Modal" or "Dialog").

## Step 4: Output Formatting (严格格式)
Output the top 1 to 3 best matches in STRICTLY CHINESE. 

**Match Found Format:**
### 🎯 推荐复用: [Name] 
- **匹配度**: (高/中) - [简要解释为什么匹配上了，比如：命中了“分页”、“搜索”标签]
- **文件路径**: `Path`
- **核心接口**: (List the key Props/Params needed)
- **调用示例**: 
  ```tsx
  // 提供1-3行的极简调用伪代码
  import { [Name] } from 'Path';
  <[Name] propA="..." />
  ```
