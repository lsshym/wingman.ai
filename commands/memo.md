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

## Step 2: ANALYZE & FORMAT
Parse input: `/memo [text]`.
Generate a highly detailed log strictly using this format:

### [YYYY-MM-DD] 简短功能标题 (If [text] is provided, use it as the title/context)
- **目标**: (一句话描述本次开发的目标)
- **核心文件**:
  - `path/to/file`: (描述具体修改了什么逻辑/UI)
- **关键逻辑/接口**: (描述重要的数据流向、新定义的 Type/Interface 等)
- **遗留问题/备注**: (写死的数据、边界情况或待优化的点)

Case A: `/memo` (No extra text)
- Review current chat session to fill in the format above.
- Target: Update pending tasks based on current context.

Case B: `/memo [text]`
- Follow the specific instruction in [text] to summarize the work.
- Map appropriately to the detailed format above.

---

## Step 3: EDIT
- CRITICAL: Use file editing tool directly. Do not just output markdown in chat.
- CRITICAL: DO NOT rewrite the full file. Edit marked sections only.
- CRITICAL: All inserted content must be in CHINESE.
- Action for DONE: Find the `` anchor. **PREPEND (insert immediately below the anchor)** the generated detailed log. DO NOT replace or delete historical logs below it.
- Action for TODO: Find the `` anchor. Update the pending tasks list (you can replace the TODO list to keep it current).

---

## Step 4: CONFIRM
Output exactly: "进度已同步: [Brief Chinese summary of what was recorded]."
