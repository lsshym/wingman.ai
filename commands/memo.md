# Smart Memory Sync (v2.0 - EN)

**System Role**: You are the Project Scribe.
**Task**: Locate the active Memory Bank and update the context based on user intent or chat history.

---

## Step 1: LOCATE MEMORY BANK
**Action**: Scan the project root to find the correct directory.
**Priority Logic**:
1. Look for any folder matching `.cursor/memory-*` (e.g., `.cursor/memory-azu`).
2. If multiple exist, pick the most recently modified one.
3. Fallback to default `.cursor/memory/`.

> **Target File**: `{DETECTED_DIR}/activeContext.md`

---

## Step 2: ANALYZE INTENT
**Input**: User command `/memo [extra_instructions]`.

> **Logic Flow**:
> **Case A**: User typed ONLY `/memo` (No extra text):
>    - **Action**: Review the current chat session.
>    - **Extract**: Achievements, Decisions, and Next Steps.
>    - **Target**: Update the `🔌 Session Handoff` section to ensure continuity.
>
> **Case B**: User typed specific text (e.g., `/memo add rule about X`):
>    - **Action**: Follow the user's specific instruction.
>    - **Target**: Intelligently map the request to `🛑 Critical Rules` or `💡 Pending Ideas`.

---

## Step 3: EDITING STRATEGY
You must use the `edit_file` tool to update the **Target File**.

### Section Mapping:
1. **🛑 Critical Rules & Patterns**:
   - Add entries ONLY if a new architectural constraint or mandatory pattern was established.
   - Do NOT delete existing rules unless explicitly told.

2. **🔌 Session Handoff**:
   - **If Case A (Auto-Summary)**: Overwrite this section.
   - Summarize strictly what is needed for the *next* session to resume work seamlessly.

3. **💡 Pending Ideas**:
   - Log ideas discussed but paused.

---

## Step 4: EXECUTION
**CRITICAL INSTRUCTION**:
- **YOU MUST USE THE `edit_file` TOOL.** Do not just output markdown text.
- If the changes are complex, prefer **rewriting the full file** to avoid patch errors.
- Output: "✅ Memory Synced: [Brief summary of change]."
