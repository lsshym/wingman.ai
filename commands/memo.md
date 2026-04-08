# Command: Memo Sync v2.1 (Auto-Sharding Edition)

**System**: Project Scribe & Knowledge Distiller.
**Task**: Update Memory Bank (Brain, Domain, and Active Context) based on user intent.
**Constraint**: System logic in English, file content writing STRICTLY IN CHINESE.

---

## Step 1: DYNAMIC LOCATE & ROUTE (动态寻址与路由)
1. Read `.cursor/brain/projectBrief.md` to review the `Domain Index`.
2. Analyze current chat context to identify the business domain (e.g., Checkout, Orders, UserCenter).
3. **Check for New Domain**: 
   - If the current logic belongs to a domain NOT in the index, prepare to **Auto-Shard**.

---

## Step 2: IRON LAWS & THE DISTILLER GATE (绝对铁律与升华门)

### Gate 1: Hallucination Check (防幻觉)
Ask: "Did the user actually write, modify, or discuss specific code in this current session?"
IF NO: STOP. Reply: "当前会话没有检测到实质性的代码变动，无需记录。"

### Gate 2: Knowledge Distillation & Auto-Shard (知识升华与分片判断)
Ask: "Does this change contain durable business rules, architectural decisions, or reusable patterns?"
- IF YES: 
  1. **Identify Target**: Determine if it goes to an existing domain or a NEW one.
  2. **Auto-Create**: If new, create `.cursor/memory/domains/<new_domain>.md` using the standard template.
  3. **Sync Index**: Add the new domain to the `Domain Index` in `projectBrief.md`.
  4. **Distill**: Write the Truth Table logic with the mandatory `[WHY]`.

### Gate 3: Generic Filler Check (绝杀废话)
Ask: "Does my drafted log contain vague phrases like '用于展示', '支持多语言', '包含逻辑', '基础组件'?"
IF YES: STOP and Rewrite. You MUST describe the EXACT interaction, state change, or API called.

---

## Step 3: STRICT FORMATTING & CHECKLIST (严格格式校验)

**Self-Verification Checklist (Must verify internally before writing):**
- [ ] **Technical Detail**: For `.ts / .tsx`, include at least 2 of [Key Interaction], [Data Source/State], [Output UI].
- [ ] **CSS Detail**: For `.scss / .css`, specify the exact component and the layout issue solved.
- [ ] **Logic Detail**: For Logic, ensure the `[WHY]` is captured if moved to Domain/Brain.
- [ ] **Atomic Record**: Ensure each core file change is reflected (No batching).

**Output Format Blueprint:**
### [YYYY-MM-DD] 简短功能标题
- **目标**: (一句话描述本次开发的核心业务目标)
- **核心文件明细**:
  - `path/to/file1.tsx`: [Function/Component Name] - [Interaction/Data/Output detailed description based on checklist].
- **遗留问题/备注**: (写死的数据、未处理的边界情况等)

---

## Step 4: MULTI-LAYER EXECUTION (多层同步写入)

- **Action 1 (Distill & Shard)**: 
  - If a new domain was identified: Create the file + Update `projectBrief.md`.
  - Update Truth Tables in relevant domain files. **Overwrite** contradictory old logic.
- **Action 2 (Active Context)**:
  - Find `` in `activeContext.md`.
  - **PREPEND** the generated detailed log. 
- **Action 3 (Todo Sync)**:
  - Update the pending tasks list below ``.

---

## Step 5: VERIFY & CONFIRM
Output exactly: "✅ 进度已同步，知识已升华并自动分片 (Iron Laws passed): [1句话简短总结刚才升华或记录的核心内容以及是否创建了新领域文件]."
