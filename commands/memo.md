# Command: Memo Sync

**System**: Project Scribe.
**Task**: Update activeContext.md based on user intent.
**Constraint**: System logic in English, file content writing STRICTLY IN CHINESE.

---

## Step 1: LOCATE
Scan root for `.cursor/memory-*/activeContext.md`.
If multiple, pick the most recently modified.
Fallback: `.cursor/memory/activeContext.md`.

---

## Step 2: STRICT ANALYSIS & FORMATTING (门禁规则)
Parse input: `/memo [text]`.
You MUST generate a highly detailed log. You are STRICTLY FORBIDDEN from using generic, low-density phrases like "用于展示", "支持多语言", "包含逻辑", or "基础组件".

**HARD CONSTRAINTS FOR LOGGING:**
1. **.ts / .tsx Files**: Description MUST include at least 2 of the following 3 elements:
   - **Key Interaction**: (e.g., button clicks, dialog triggers, route navigation).
   - **Data Source/State**: (e.g., specific API called, Zustand store updated, or specific Props passed).
   - **Output**: (e.g., what specific UI block was rendered or state mutated).
2. **.scss / .css Files**: MUST specify which exact component it serves and what layout issue it solves (e.g., mobile responsiveness, dialog layout).
3. **Assets (svg/png)**: MUST specify at least one component where it is imported/used.
4. **Coverage**: The number of core files changed MUST equal the number of items recorded. Do not batch or group files into single bullet points unless they are purely type exports.

### Output Format Blueprint:
### [YYYY-MM-DD] 简短功能标题 (If [text] is provided, use it as the title/context)
- **目标**: (一句话描述本次开发的核心业务目标)
- **核心文件明细**:
  - `path/to/file1.tsx`: [Function/Component Name] - [Interaction/Data/Output detailed description based on Hard Constraints].
  - `path/to/file2.ts`: [Function Name] - [Interaction/Data/Output detailed description based on Hard Constraints].
- **遗留问题/备注**: (写死的数据、未处理的边界情况等)

Case A: `/memo` (No extra text)
- Review current chat session to fill in the format above strictly adhering to Hard Constraints.
- Target: Update pending tasks based on current context.

Case B: `/memo [text]`
- Follow the specific instruction in [text] to summarize the work.
- Map appropriately to the detailed format above strictly adhering to Hard Constraints.

---

## Step 3: EDIT
- CRITICAL: Use file editing tool directly. Do not just output markdown in chat.
- CRITICAL: DO NOT rewrite the full file. Edit marked sections only.
- CRITICAL: All inserted content must be in CHINESE.
- Action for DONE: Find the `` anchor. **PREPEND (insert immediately below the anchor)** the generated detailed log. DO NOT replace or delete historical logs below it.
- Action for TODO: Find the `` anchor. Update the pending tasks list (you can replace the TODO list to keep it current).

---

## Step 4: VERIFY & CONFIRM
Self-Correction before output: Did every recorded file meet the Hard Constraints? Are generic filler words avoided? If no, rewrite the log internally before saving to the file.
Output exactly: "进度已极其详尽地同步: [Brief Chinese summary of what was recorded]."
