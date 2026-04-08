# Command: Memo Sync v2.1 (Distillation Edition)

**System**: Project Scribe & Knowledge Distiller.
**Task**: Update Memory Bank (Brain, Domain, and Active Context) based on user intent.
**Constraint**: System logic in English, file content writing STRICTLY IN CHINESE.

---

## Step 1: DYNAMIC LOCATE (寻址)
1. Read `.cursor/brain/projectBrief.md` to get the Domain Index.
2. Identify the current working domain based on the chat context.
3. Locate relevant files:
   - Layer 1: `.cursor/brain/projectBrief.md`
   - Layer 2: `.cursor/memory/domains/<domain_name>.md`
   - Layer 3: `.cursor/memory/activeContext.md`

---

## Step 2: IRON LAWS & THE DISTILLER GATE (绝对铁律与升华门)

### Gate 1: Hallucination Check (防幻觉)
Ask: "Did the user actually write, modify, or discuss specific code in this current session?"
IF NO: STOP. Reply: "当前会话没有检测到实质性的代码变动，无需记录。"

### Gate 2: Knowledge Distillation (知识升华判断)
Ask: "Does this change contain durable business rules, architectural decisions, or reusable patterns?"
- IF YES: You MUST update Layer 1 (Global ADR) or Layer 2 (Domain Truth Table). 
- **Requirement**: Include the `[WHY]` for every distilled point.

### Gate 3: Generic Filler Check (绝杀废话)
Ask: "Does my drafted log contain vague phrases like '用于展示', '支持多语言', '包含逻辑', '基础组件'?"
IF YES: STOP and Rewrite. You MUST describe the EXACT interaction, state change, or API called.

---

## Step 3: STRICT FORMATTING & CHECKLIST (严格格式校验)

**Self-Verification Checklist (Must verify internally before writing):**
- [ ] For `.ts / .tsx`: Include at least 2 of [Key Interaction], [Data Source/State], [Output UI].
- [ ] For `.scss / .css`: Specify the exact component it serves and the layout issue solved.
- [ ] For Logic: Ensure the `[WHY]` is captured if moved to Domain/Brain.
- [ ] Does the number of core files changed equal the number of items recorded? (No batching).

**Output Format Blueprint:**
### [YYYY-MM-DD] 简短功能标题
- **目标**: (一句话描述本次开发的核心业务目标)
- **核心文件明细**:
  - `path/to/file1.tsx`: [Function/Component Name] - [Interaction/Data/Output detailed description based on checklist].
- **遗留问题/备注**: (写死的数据、未处理的边界情况等)

---

## Step 4: MULTI-LAYER EXECUTION (同步写入)

- **Action for Layer 1/2 (Distill)**: 
  If high-value knowledge is found, update `projectBrief.md` or `domains/<name>.md`. 
  **Overwrite** old contradictory logic. Do not just append.
- **Action for Layer 3 (Active Context)**:
  Find the `` in `activeContext.md`.
  **PREPEND** the generated detailed log. 
- **Action for TODO**:
  Update the pending tasks list below the ``.

---

## Step 5: VERIFY & CONFIRM
Output exactly: "✅ 进度已同步，高价值知识已升华 (Iron Laws passed): [1句话简短总结刚才升华或记录的核心内容]."
