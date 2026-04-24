---
name: reg
description: Register a component, hook, or utility into the project registry when the user asks to catalog or index reusable code.
---

# Command: Register Component

**System**: Component Registrar.
**Task**: Extract the exact features of one component/utility and append them to the correct registry file without overwriting or duplicating existing entries.

---

## Step 1: Trigger & Locate
Triggered when the user types `/reg [component/path]` or `/reg`.

- If a target is explicitly provided, use that exact target.
- If no target is provided, silently use the currently active file in the editor.
- If there is no active file, use the most recently modified relevant source file from the current context.
- **Process exactly ONE target per invocation.**
- Do **NOT** batch-register multiple components in one `/reg` run.

---

## Step 2: Iron Laws (Hard Safety Gates)

### Gate 1: Source Read Required
You MUST read the actual source code of the target before doing anything else.

Ask yourself:
> "Did I read the source code and understand its exact props/params and behavior?"

If NO:
- STOP
- Read the source file first
- Do NOT infer behavior from file name, folder name, or usage sites alone

### Gate 2: No Broad Scanning
Do NOT scan the whole codebase for “similar” components unless the user explicitly asked for bulk registration.
This command is for **one component only**.

### Gate 3: No Destructive Writes
You must never overwrite an existing registry file just to add a new entry.
This command is **append-only**.

If a registry file already exists:
- You MUST read its current contents first
- You MUST preserve all existing entries exactly as they are
- You MUST append a new block only when the target is not already registered

---

## Step 3: Extract Features
From the source code, extract EXACTLY these 5 elements:

1. **Name**
   - Component, function, hook, or utility name

2. **Path**
   - Relative import path
   - Example: `@/components/ui/button`

3. **Tags**
   - Extract 3-6 precise keywords describing:
     - UI type
     - core behavior
     - state/control model
     - API/data behavior
     - platform traits (responsive, mobile drawer, etc.)
   - Example:
     `[form interaction, async upload, Zustand, mobile-friendly]`

4. **Description**
   - 1-2 concise sentences describing what it actually does

5. **Interface Signature**
   - For UI/business components:
     - list only the props that control the main behavior
     - skip generic native props such as `className`, `style`, etc.
   - For hooks/utils:
     - list the main parameters and return value

---

## Step 4: Categorize
Choose the target registry file based on the target’s actual nature:

- Pure presentation UI components
  -> `.cursor/brain/ui-components.md`

- Components with business logic, API calls, routing, global state, device branching, or workflow logic
  -> `.cursor/brain/business-components.md`

- Pure logic functions, helpers, or React hooks
  -> `.cursor/brain/utils.md`

### Important classification rule
If a component wraps low-level UI primitives but also contains behavioral branching or environment/device logic,
classify it as a **business component only if the business logic is primary**.
Otherwise classify it as a **UI component**.

Never register the same component in two registry files.

---

## Step 5: Deduplication (Strict)
Before writing anything, you MUST check for duplicates.

### 5.1 Read registry files first
Read:
- `.cursor/brain/ui-components.md` if it exists
- `.cursor/brain/business-components.md` if it exists
- `.cursor/brain/utils.md` if it exists

### 5.2 Duplicate key
Use **Path** as the primary deduplication key.
Do NOT use Name alone, because different components may share the same name in different folders.

### 5.3 Deduplication rules
- If the same **Path** already exists in the chosen target registry:
  - DO NOT append again
  - Return the duplicate-skip response

- If the same **Path** already exists in a different registry file:
  - DO NOT append again
  - Return the cross-registry warning response

- If the same **Name** exists but the **Path** is different:
  - This is **not** a duplicate
  - You may register it normally

---

## Step 6: Safe Append Procedure
You must use a safe append workflow.

### Case A: Target registry file does not exist
Create it with a minimal header, then append the new block.

### Case B: Target registry file exists
- Read the existing file
- Preserve all current content exactly
- Append the new block to the end of the file
- Do NOT rewrite or replace the whole file
- Do NOT remove older entries
- Do NOT reorder older entries

### Forbidden behaviors
- Never use a write operation that replaces the entire existing file content
- Never delete prior records
- Never “refresh” the file by rewriting all entries
- Never merge multiple newly found components into one `/reg` call

---

## Step 7: Target Write Format (Strictly Chinese)
Append exactly this block format:

### [Name]
- **路径**: `Path`
- **特征/标签**: `[Tags]`
- **功能描述**: (Description)
- **核心接口**: (Props/Params details)

---

## Step 8: Confirmation Responses

### Success response
Reply EXACTLY:
`✅ **[Name]** 已成功提取特征并注册至 \`[Target File]\`。提取标签：[Tags]。后续可通过 \`/find\` 命令检索。`

### Duplicate-in-same-file response
Reply EXACTLY:
`⚠️ **[Name]** 已存在于 \`[Target File]\` 中，已跳过重复登记。判重依据：路径 \`[Path]\`。`

### Duplicate-in-other-registry response
Reply EXACTLY:
`⚠️ **[Name]** 已存在于 \`[Existing File]\` 中，已跳过跨表重复登记。判重依据：路径 \`[Path]\`。`

---

## Step 9: Final Checklist
Before finishing, verify all of the following:

- [ ] I read the actual source code
- [ ] I processed exactly one target
- [ ] I chose exactly one registry file
- [ ] I read existing registry files before writing
- [ ] I checked duplicates by **Path**
- [ ] I did not overwrite existing registry content
- [ ] I did not delete prior entries
- [ ] I did not register the same component twice

--- End Command ---
