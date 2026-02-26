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

## Step 2: ANALYZE
Parse input: `/memo [text]`.

Case A: `/memo` (No extra text)
- Review current chat session.
- Target: Replace text below `` with what has been done.
- Target: Update `` with pending tasks.

Case B: `/memo [text]`
- Follow specific instruction.
- Map appropriately to `` or ``.

---

## Step 3: EDIT
- CRITICAL: Use file editing tool directly. Do not output markdown in chat.
- CRITICAL: Insert or replace text specifically at HTML anchors (``, ``).
- CRITICAL: DO NOT rewrite the full file. Edit marked sections only.
- CRITICAL: All inserted content must be in CHINESE.

---

## Step 4: CONFIRM
Output exactly: "进度已同步: [Brief Chinese summary of what was recorded]."
