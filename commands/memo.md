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

## Step 2: IRON LAWS & GATE FUNCTIONS (绝对铁律)
Before generating any log, you MUST pass these gates:

### Gate 1: Hallucination Check
Ask: "Did the user actually write, modify, or discuss specific code in this current session?"
IF NO: 
  STOP - Do not write to the file. Reply: "当前会话没有检测到实质性的代码变动，无需记录。"

### Gate 2: Generic Filler Check
Ask: "Does my drafted log contain vague phrases like '用于展示', '支持多语言', '包含逻辑', '基础组件'?"
IF YES: 
  STOP - Rewrite the draft. You MUST describe the EXACT interaction, state change, or API called.

---

## Step 3: STRICT FORMATTING & CHECKLIST (Low Freedom - 严格格式)
Parse input: `/memo [text]`.
Case A: `/memo` (No extra text) -> Review current chat session.
Case B: `/memo [text]` -> Follow the specific instruction in [text].

**Self-Verification Checklist (Must verify internally before writing):**
- [ ] For `.ts / .tsx`: Did I include at least 2 of [Key Interaction], [Data Source/State], [Output UI]?
- [ ] For `.scss / .css`: Did I specify the exact component it serves and the layout issue solved?
- [ ] For Assets: Did I specify where it is imported?
- [ ] Does the number of core files changed equal the number of items recorded? (No batching).

**Output Format Blueprint (MUST BE EXACT):**
### [YYYY-MM-DD] 简短功能标题 (If [text] is provided, use it as title)
- **目标**: (一句话描述本次开发的核心业务目标)
- **核心文件明细**:
  - `path/to/file1.tsx`: [Function/Component Name] - [Interaction/Data/Output detailed description based on checklist].
  - `path/to/file2.ts`: [Function Name] - [Interaction/Data/Output detailed description].
- **遗留问题/备注**: (写死的数据、未处理的边界情况等)

---

## Step 4: EDIT (CRITICAL ANCHOR SYNC)
- CRITICAL: Use the file editing tool directly. Do not just output markdown in chat.
- CRITICAL: DO NOT rewrite the full file. Edit marked sections only.
- CRITICAL: All inserted content must be in CHINESE.
- **Action for DONE**: Find the `` HTML comment anchor. **PREPEND (insert immediately below the anchor)** the generated detailed log. DO NOT replace or delete historical logs below it.
- **Action for TODO**: Find the `` HTML comment anchor. Update the pending tasks list immediately below it.

---

## Step 5: VERIFY & CONFIRM
Output exactly: "✅ 进度已极其详尽地同步 (Iron Laws passed): [1句话简短总结刚才记录的核心功能]."
