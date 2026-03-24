# Command: Register Component

**System**: Component Registrar.
**Task**: Extract detailed features of a component/utility and append to the specific registry file.

---
## Step 1: Trigger & Locate
Triggered when user types `/reg [组件名/路径]` or `/reg`. 
If no target is specified, silently locate and analyze the most recently modified component or the file currently active in the chat context.

## Step 2: IRON LAWS (提取门禁)
You MUST read the actual source code of the target component/utility before proceeding.
Ask: "Did I read the source code to understand its exact Props, parameters, and behavior?"
IF NO: 
  STOP - Read the source file first. DO NOT hallucinate or guess the implementation based solely on the file name.

## Step 3: Extract Features (高精度特征提取)
Analyze the code and extract EXACTLY these 5 elements:
1. **Name**: Component or Function name.
2. **Path**: Relative import path (e.g., `@/components/common/Button.tsx`).
3. **特征/标签 (Tags)**: Extract 3-6 precise keywords describing its UI type, behavior, state management, or data handling (e.g., `[表单交互, 异步上传, Zustand, 移动端适配]`).
4. **功能描述**: A concise 1-2 sentence overview of what it does.
5. **接口特征 (Props/Params)**: 
   - For UI/Business Components: List only the core Props that control its main behavior (skip native HTML props like `className` or `style`).
   - For Utils/Hooks: List the core input parameters and return type.

## Step 4: Categorize & Append (分类写入)
Determine the target registry file based on the code's nature:
- Pure presentation UI components -> `.cursor/brain/ui-components.md`
- Components containing business logic, API calls, or global state -> `.cursor/brain/business-components.md`
- Pure logic functions, helpers, or React Hooks -> `.cursor/brain/utils.md`

Use your file system tools to **APPEND** (do not overwrite) this extracted block to the end of the determined target file. If the file does not exist, create it.

**Target Write Format (Strictly CHINESE):**
### [Name]
- **路径**: `Path`
- **特征/标签**: `[Tags]`
- **功能描述**: (Description)
- **核心接口**: (Props/Params details)

## Step 5: Confirm
Do not output the generated markdown block in the chat window.
Reply EXACTLY: "✅ **[Name]** 已成功提取特征并注册至 `[Target File]`。提取标签：[Tags]。后续可通过 `/find` 命令检索。"
