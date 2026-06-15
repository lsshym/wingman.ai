# Memory Skills Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Update the root Wingman memory skill rules and references so memory becomes a searchable, promotable, cleanable knowledge system with domain truth, topic history indexes, and candidate-driven cleanup.

**Architecture:** The root `skills/` files are the source of truth for this change. `memory-setup` defines the on-demand file shapes, `memory-load` reads current truth plus relevant topic/domain history indexes, `memory-sync` routes and promotes durable knowledge, and `memory-clean` migrates old context into domains/history without line-count triggers. History event templates and sync templates provide the shared formats used by the skills.

**Tech Stack:** Markdown skill files, Wingman `.wingman/memory/` conventions, local shell validation with `rg`, `sed`, `git diff`, and optionally `npm run check:release`.

---

## File Structure

- Modify `skills/memory-setup/SKILL.md`: update the setup templates and on-demand memory layout to include the new Domain Registry schema, folder domains, and topic history indexes.
- Modify `skills/memory-load/SKILL.md`: update read routing to use `History Domain Index` and `History Topics`, load relevant history indexes during non-trivial work, and replace line-count pressure checks with concrete memory candidate signals.
- Modify `skills/memory-sync/SKILL.md`: add Promotion Check before routing, widen durable truth and history thresholds, add pointer context behavior, and require topic projection updates for history events.
- Modify `skills/memory-clean/SKILL.md`: replace line-count pressure with candidate-driven cleanup, add promotion/domain-split/history-topic-index scopes, add promotion classifications, and keep deletion confirmation strict.
- Modify `skills/memory-sync/references/history-events.md`: add `history/topics/`, `Topics` metadata, topic projection templates, and topic index update steps.
- Modify `skills/memory-sync/references/templates.md`: add a context pointer template and topic naming guidance.

Out of scope for this implementation:

- `tests/`
- `plugins/wingman/`
- Marketplace or manifest files
- Real project memory migration
- Migration scripts

### Intentional Design Adjustments From The Original Note

- Use generic examples such as `checkout-flow`, `payment-selection`, `order-status`, `product-detail`, `upload-retry`, and `quota-display`; do not use project-specific example names such as prior business code names.
- Do not use fixed line-count thresholds to trigger cleanup. Line count may be diagnostic only. Cleanup is triggered by concrete candidates such as promotable facts, repeated logs, current-rule conflicts, duplicate current/context content, or user-specified cleanup targets.

## Task 1: Update `memory-setup`

**Files:**
- Modify: `skills/memory-setup/SKILL.md`

- [x] **Step 1: Replace the Domain Registry template**

In `skills/memory-setup/SKILL.md`, replace the `## 2. Domain Registry` table in the Brief Template with:

```markdown
## 2. Domain Registry
| Domain | Read When | Current File | History Domain Index | History Topics | Aliases | Related Domains | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

Registry status values describe whether a domain is still used for routing: `current | deprecated | superseded`.
`Current File` is the authoritative current-truth file or folder index. `History Domain Index` and `History Topics` are lookup indexes for historical context, not current truth. `Related Domains` are read only when relevant to the task.
```

- [x] **Step 2: Replace the Memory Layout section**

In the Brief Template, replace the `## 3. Memory Layout` bullets with:

```markdown
## 3. Memory Layout
- `brief.md`: global rules, ADRs, memory settings, and the Domain Registry.
- `context.md`: hot task context, pending work, and recent high-signal logs. It is not a long-term knowledge base.
- `domains/`: current durable domain truth, created on demand.
- `history/events/`: event bodies, created on demand.
- `history/domains/`: domain projection indexes for feature-time lookup.
- `history/topics/`: topic projection indexes for feature and problem-cluster lookup.
- `history/months/`: date projection indexes for date-based lookup.
- Context logs should preserve the reason for non-trivial short-term changes. Durable rules with binding force belong in `domains/` or `brief.md`; historical explanation belongs in `history/`.
```

- [x] **Step 3: Expand the On-Demand Domain Shape section**

Keep the current durable truth template, but make the introductory text explicitly allow folder domains:

```markdown
When durable domain knowledge first appears, create either `.wingman/memory/domains/<domain>.md` for a small domain or `.wingman/memory/domains/<domain>/index.md` plus focused topic files for a large domain.

Use a folder domain when one domain spans multiple subflows, data contracts, or recurring task areas:

```text
domains/<domain>/index.md
domains/<domain>/<topic>.md
```
```

Ensure the `## Subfiles` example remains in the template.

- [x] **Step 4: Expand the On-Demand History Shape section**

Replace the history tree with:

```text
.wingman/memory/history/
  index.md
  domains/
    <domain>.md
  topics/
    <topic>.md
  months/
    YYYY-MM.md
  events/
    YYYY/
      MM/
        YYYY-MM-DD-<event-slug>.md
```

Then update the explanatory paragraph to say event bodies stay under `events/YYYY/MM/`, while `domains/`, `topics/`, and `months/` are projection indexes containing links and short summaries only.

- [x] **Step 5: Verify `memory-setup` text**

Run:

```bash
rg -n "History Domain Index|History Topics|history/topics|events/YYYY/MM|Domain \\| Read When \\| Current File \\| History \\|" skills/memory-setup/SKILL.md
```

Expected:

- Matches for `History Domain Index`, `History Topics`, `history/topics`, and `events/YYYY/MM`.
- No match for the old registry table `Domain | Read When | Current File | History | Aliases | Related Domains | Status`.

## Task 2: Update `history-events.md`

**Files:**
- Modify: `skills/memory-sync/references/history-events.md`

- [x] **Step 1: Add topic indexes to the Model section**

Update the model bullets to include:

```markdown
- `history/topics/<topic>.md` is the topic history projection for feature, workflow, or recurring problem lookup.
```

- [x] **Step 2: Update the Write Procedure**

Replace the procedure with a version that includes topic indexes:

```markdown
1. Create `.wingman/memory/history/`, `history/events/YYYY/MM/`, `history/domains/`, `history/topics/`, and `history/months/` if needed.
2. Create or update `history/index.md` as the top-level projection entry. Keep it small: list projection files and only recent high-signal events.
3. Write one event body named `.wingman/memory/history/events/YYYY/MM/YYYY-MM-DD-<event-slug>.md`.
4. Update `history/domains/<primary-domain>.md`.
5. Update each related `history/domains/<related-domain>.md` when the event genuinely touches that domain.
6. Update each relevant `history/topics/<topic>.md`.
7. Update `history/months/YYYY-MM.md`.
8. Include `Promoted Truths` links when domain truth or project ADR was written. Use `None` when no current truth was promoted.
9. Do not rewrite event bodies just because a projection index changes.
```

- [x] **Step 3: Add `Topics` to the event body template**

Insert this field after `Related Domains`:

```markdown
- **Topics**: `<topic list or None>`
```

- [x] **Step 4: Add topic indexes to the top-level index template**

Insert this section between Domain Indexes and Month Indexes:

```markdown
## Topic Indexes
- `topics/<topic>.md`: <short description>
```

- [x] **Step 5: Add a Topic Projection Template**

Add this template after the Domain Projection Template:

```markdown
## Topic Projection Template

Use this shape when no stronger local format exists:

```markdown
# <Topic> History Index

## Read When
- <task signals>

## Events
- `../events/YYYY/MM/YYYY-MM-DD-<event-slug>.md`: <summary>; primary `<domain>`; promoted `<truth link or None>`
```
```

- [x] **Step 6: Update Growth Rules**

Ensure Growth Rules say:

```markdown
- If a topic projection grows too large, split the projection index, not the event body, for example `history/topics/<topic>-<subtopic>.md`.
- Event bodies remain under `history/events/YYYY/MM/` and are not copied into domain, topic, or month directories.
```

- [x] **Step 7: Verify history reference text**

Run:

```bash
rg -n "history/topics|Topics|Topic Indexes|Topic Projection|domain, topic, or month" skills/memory-sync/references/history-events.md
```

Expected: all terms appear.

## Task 3: Update `templates.md`

**Files:**
- Modify: `skills/memory-sync/references/templates.md`

- [x] **Step 1: Add a Context Pointer Template**

After the Context Log Template section, add:

```markdown
## Context Pointer Template

Use this when the durable rule or historical event was written elsewhere and `context.md` should avoid repeating the full event body.

For English memory:

```markdown
### [YYYY-MM-DD] Short title

- **Goal**: One sentence describing the work.
- **Result**: Current truth and/or history was written to durable memory.
- **Pointers**:
  - `domains/<domain>.md` or `domains/<domain>/<topic>.md`: current rule now lives here.
  - `history/events/YYYY/MM/YYYY-MM-DD-<event-slug>.md`: historical event, when one was written.
- **Reason**: Changed X because Y; prevents Z.
```

For Chinese memory, preserve code paths and use equivalent Chinese labels when the existing memory is Chinese.
```

- [x] **Step 2: Clarify durable truth History links**

After the Durable Truth Template, add:

```markdown
`History` points to a specific event body under `history/events/YYYY/MM/` or `None`. It does not point to `history/domains/`, `history/topics/`, or `history/months/` projection indexes.
```

- [x] **Step 3: Add topic naming guidance**

Add:

```markdown
## Topic Naming Guidance

Use stable, generic feature, workflow, or problem-cluster names:

- `checkout-flow`
- `payment-selection`
- `order-status`
- `product-detail`
- `upload-retry`
- `quota-display`

Do not use customer names, project code names, one-off business campaign names, or temporary implementation labels as topic names.
```

- [x] **Step 4: Verify template text**

Run:

```bash
rg -n "Context Pointer Template|history/events/YYYY/MM|Topic Naming Guidance|checkout-flow|payment-selection|quota-display" skills/memory-sync/references/templates.md
```

Expected: all terms appear.

## Task 4: Update `memory-sync`

**Files:**
- Modify: `skills/memory-sync/SKILL.md`

- [x] **Step 1: Update the Core Rule**

Change the first sentence to:

```markdown
`memory-sync` writes the smallest useful memory update after meaningful work, while promoting durable knowledge out of hot context when future agents would otherwise re-read old logs or re-debug the same issue.
```

Keep the existing bullets that current truth belongs in `brief.md` or `domains/`, history is trace context, and small isolated changes may write nothing.

- [x] **Step 2: Add Promotion Check before Routing**

Insert before the Routing table:

```markdown
## Promotion Check

Before writing a context log, check whether the new fact or existing same-feature context logs should be promoted to current truth or history.

Prefer promotion when any of these are true:

- The fact defines a stable API path, request body, response field, field meaning, schema, payload, state mapping, enum, route rule, permission rule, payment rule, money rule, quota rule, or lifecycle rule.
- The user corrected a business meaning, field meaning, or workflow interpretation.
- The work fixed a recurring debugging conclusion or a mistake future agents are likely to repeat.
- The behavior crosses files, modules, pages, APIs, or domains.
- The same feature, workflow, or domain already has multiple context logs and those logs now contain long-lived knowledge.
- Future agents would need the fact to avoid re-reading old logs, re-debugging, or choosing a semantically wrong field.

Promotion does not mean every promoted fact needs history. Current truth explains what is binding now; history explains important source events.
```

- [x] **Step 3: Widen the `DOMAIN_TRUTH` and `HISTORY_EVENT` thresholds**

Update the Thresholds section so:

```markdown
**DOMAIN_TRUTH** or **PROJECT_ADR** when future agents must obey the result or would otherwise need old logs to avoid re-debugging: stable field meaning, API path/body/response contract, schema, event, config, data model, state or enum mapping, permission, routing, money, quota, lifecycle, product or business invariant, cross-file behavior contract, recurring debugging conclusion with a clear trigger, repository-wide convention, or architecture decision.

**HISTORY_EVENT** defaults to no for small local changes. It defaults to yes when a non-trivial **DOMAIN_TRUTH** or **PROJECT_ADR** was written for a feature milestone, contract decision, field decision, state-flow correction, recurring debugging conclusion, migration, incident, important bug or regression fix, or user-requested historical memory, unless the event has no trace value beyond the current rule.
```

- [x] **Step 4: Update Workflow**

Update the Workflow steps to include Promotion Check and context pointer behavior:

```markdown
1. Apply the Gate.
2. Run Promotion Check before deciding to write a context log.
3. Route facts using the Thresholds.
4. If every fact is **IGNORE**, write nothing and say which threshold blocked the update.
5. For **DOMAIN_TRUTH** or **PROJECT_ADR**, pass the Evidence Gate before writing current truth.
6. Write current truth before history when both are needed.
7. Decide **HISTORY_EVENT** after current truth routing. Write history when the History threshold passes.
8. Write **CONTEXT_LOG** only for hot context. When current truth or history already carries the durable detail, write a short pointer instead of repeating the full event.
9. Report changed memory files, projection indexes, or the threshold that blocked writing.
```

- [x] **Step 5: Update Context Log rules**

In `### Context Log`, add:

```markdown
- If **DOMAIN_TRUTH**, **PROJECT_ADR**, or **HISTORY_EVENT** was written for the same fact, use the Context Pointer Template from `references/templates.md` instead of duplicating durable detail in `context.md`.
```

- [x] **Step 6: Update Current Truth rules for new registry schema**

In `### Current Truth`, ensure the rules say:

```markdown
- Update the Domain Registry when creating, renaming, deprecating, or superseding a domain route. New registry rows use `Domain | Read When | Current File | History Domain Index | History Topics | Aliases | Related Domains | Status`.
- When creating a new domain, choose `.wingman/memory/domains/<domain>.md` for a small domain or `.wingman/memory/domains/<domain>/index.md` plus focused topic files for a large domain.
- Use stable, generic topic names for domain subfiles and history topics. Avoid customer names, project code names, and one-off business labels.
```

- [x] **Step 7: Update History Event rules**

In `### History Event`, update the projection list:

```markdown
- Update `.wingman/memory/history/index.md`, `.wingman/memory/history/domains/<domain>.md`, `.wingman/memory/history/topics/<topic>.md`, and `.wingman/memory/history/months/YYYY-MM.md`.
```

Also add:

```markdown
- Choose topics from the task's feature, workflow, or problem cluster. Use generic names such as `checkout-flow`, `payment-selection`, `order-status`, `product-detail`, `upload-retry`, or `quota-display`.
```

- [x] **Step 8: Update completion reporting**

At the end, ensure completion says:

```markdown
Finish by reporting changed memory files, including context, domain truth, history event bodies, and projection indexes. If no history event was written, name the threshold or reason that blocked history.
```

- [x] **Step 9: Verify sync text**

Run:

```bash
rg -n "Promotion Check|History Domain Index|History Topics|Context Pointer Template|history/topics|defaults to yes|checkout-flow|quota-display" skills/memory-sync/SKILL.md
```

Expected: all terms appear.

## Task 5: Update `memory-load`

**Files:**
- Modify: `skills/memory-load/SKILL.md`

- [x] **Step 1: Update Domain Registry field descriptions**

In `Read Authority And Routing`, replace the old `History` field description with:

```markdown
- `History Domain Index`: domain-level history projection for historical lookup only.
- `History Topics`: topic projection ids for feature, workflow, or recurring problem lookup.
```

Keep `Domain`, `Read When`, `Current File`, `Aliases`, `Related Domains`, and `Status`.

- [x] **Step 2: Update history model bullets**

Add:

```markdown
- `history/topics/<topic>.md`: topic history projection.
```

- [x] **Step 3: Rewrite Load Protocol history steps**

Replace steps 11-13 with:

```markdown
11. Use `History Domain Index` and `History Topics` from matched registry rows to choose relevant history projections.
12. Read history projections when any of these are true:
    - the user asks about history, previous work, "之前", "上次", "为什么以前", or source reasoning;
    - the current non-trivial task matches a domain with a `History Domain Index`;
    - the current non-trivial task matches a topic listed in `History Topics`;
    - current domain truth links directly to a specific `history/events/` event body;
    - `context.md` mentions a related historical event.
13. Prefer history sources in this order: direct event links from current truth, `history/topics/<topic>.md`, `history/domains/<domain>.md`, `history/months/YYYY-MM.md` for date questions only, then `history/index.md` only when projection routing is unclear or the user asks broadly.
14. Read matched history event bodies only after checking the relevant projection. Choose only the strongest 0-3 event bodies for the current task. Do not scan `history/events/` directly, do not read every history event by default, and do not read history before current truth.
```

Renumber the remaining steps.

- [x] **Step 4: Update Memory Context Checklist**

Add:

```markdown
- Relevant history projections read, if any.
- Relevant history event bodies read, if any.
- Whether context logs appear to need promotion or cleanup.
```

- [x] **Step 5: Replace Memory Pressure Signals**

Replace `Memory Pressure Signals` with candidate-driven wording:

```markdown
## Memory Pressure Signals

`memory-load` is read-only. It may notice memory pressure, but must not compact, summarize, delete, promote, or invoke cleanup.

Do not suggest cleanup only because a file exceeds a fixed line count. Line count may be diagnostic, but cleanup suggestions must name concrete candidates:

- **Promotion candidate**: `context.md` contains durable rules, contracts, field meanings, state flow, permissions, money rules, routing rules, or recurring debugging conclusions that are not in `domains/` or `brief.md`.
- **Pointer candidate**: `context.md` repeats details already carried by `domains/` or `history/events/`.
- **Current-rule conflict**: two current rules or ADRs conflict, or an old rule still appears current after replacement.
- **History index gap**: relevant event history exists but no topic projection helps feature-time lookup.
- **Default-read noise**: completed, low-reuse process logs obscure the active task or pending work.

If a concrete candidate affects the task, mention it and suggest explicit `memory-clean` later. If it blocks correct work, stop and ask which rule is valid. Do not treat large `history/` as pressure unless the user asked to inspect history.
```

- [x] **Step 6: Verify load text**

Run:

```bash
rg -n "History Domain Index|History Topics|history/topics|0-3|Promotion candidate|fixed line count|history/events" skills/memory-load/SKILL.md
```

Expected: all terms appear.

## Task 6: Update `memory-clean`

**Files:**
- Modify: `skills/memory-clean/SKILL.md`

- [x] **Step 1: Update Core Rule**

Replace the first paragraph and bullets with:

```markdown
Clean Wingman memory only when the user explicitly asks. Optimize for future token cost, current-rule accuracy, and safe promotion of long-lived knowledge out of hot context:

- Keep default-read memory focused: `brief.md`, `context.md`.
- Keep current rules non-conflicting: `brief.md`, relevant `domains/`.
- Promote durable knowledge from `context.md` into `domains/`, `brief.md`, or `history/` before compacting old logs.
- Leave cold history event bodies alone unless the user explicitly asks about history cleanup.
- Delete logs only after a separate manual confirmation.
```

- [x] **Step 2: Update Repository Gate**

Keep the repository state checks, but change the size check line to:

```markdown
4. When helpful, inspect file size or line count only as diagnostics before reading large files. Size alone is not a cleanup trigger.
```

- [x] **Step 3: Update Optional Resources**

Change the memory-stats bullet to:

```markdown
- Run `scripts/memory-stats.sh` when heading layout, file size, or candidate discovery is unclear. The script is read-only and does not replace semantic judgment.
```

- [x] **Step 4: Replace Scope Selection table**

Use:

```markdown
| Scope | Read | Use When |
| --- | --- | --- |
| `context` | `context.md` | Recent logs are duplicated, stale, noisy, pointer candidates, or no longer hot. |
| `promotion` | `context.md`, `brief.md`, relevant domains/history projections | Context contains long-lived knowledge that should become current truth or history. |
| `brief` | `brief.md` | ADRs, registry, memory settings, or global rules are bloated, stale, or conflicting. |
| `domain` | One relevant domain file | A current rule changed, conflicts, or was duplicated. |
| `domain-split` | `brief.md`, one broad domain file | A domain file mixes unrelated subdomains and should become a folder domain. |
| `history-index` | Relevant history projection only | History indexes are bloated or copy event bodies. |
| `history-topic-index` | Relevant history projections and event metadata | History exists but feature lookup needs topic projections. |
| `delete-proposal` | Target files only | The user asks to delete logs or remove noise. |
```

- [x] **Step 5: Replace Pressure Check with Cleanup Candidate Check**

Replace the `## Pressure Check` section with:

```markdown
## Cleanup Candidate Check

Clean only when at least one concrete candidate exists:

- **Promotion candidate**: `context.md` contains durable rules, API contracts, field meanings, state flow, permissions, money rules, routing rules, product or business invariants, or recurring debugging conclusions that should become current truth or history.
- **Pointer candidate**: content in `context.md` is already represented by `brief.md`, `domains/`, or `history/events/` and can be compacted to a precise pointer.
- **Duplicate or correction candidate**: logs repeat the same task, or an older log was corrected by a later log.
- **Default-read noise candidate**: completed, low-reuse process logs obscure current work, pending work, or high-signal context.
- **Current-rule conflict**: two rules are marked current, or a replaced rule is not marked `superseded` or `deprecated`.
- **History-topic candidate**: history events exist but feature-time lookup needs `history/topics/<topic>.md`.
- The user explicitly identifies content to clean.

Do not clean solely because `context.md`, `brief.md`, or any other memory file exceeds a fixed line count. File size and line count are diagnostics only. If a file is long but has no safe promotion, compaction, pointer, deletion, conflict, or topic-index candidate, write nothing and explain that no worthwhile cleanup candidate was found.
```

- [x] **Step 6: Update Classification table**

Replace the classification table with:

```markdown
| Label | Meaning | Action |
| --- | --- | --- |
| `KEEP_HOT` | Still needed as active task, pending work, unresolved issue, or recent high-signal context. | Preserve in context. |
| `PROMOTE_DOMAIN` | Long-lived current truth belongs in a domain file or project ADR. | Write current truth with evidence, then compact context to a pointer when safe. |
| `PROMOTE_HISTORY` | Event has trace value but is not current truth. | Write history event and projections, then compact context to a pointer when safe. |
| `PROMOTE_BOTH` | Current truth and historical source event are both needed. | Write current truth first, write history event/projections, then compact context to a pointer. |
| `COMPACT_TO_POINTER` | Useful details are already preserved in current truth or history. | Replace verbose context with a precise pointer. |
| `SUPERSEDE` | Old current rule replaced by a newer rule. | Mark `superseded` or `deprecated`; do not delete. |
| `DELETE_CANDIDATE` | Duplicate, corrected, noisy, sensitive, or safely represented elsewhere. | Propose deletion; wait for confirmation. |
| `NO_ACTION` | Cleanup cost or ambiguity exceeds benefit. | Leave unchanged. |
```

- [x] **Step 7: Update Compaction Rules**

Add:

```markdown
- Promotion cleanup: when evidence is clear, write durable rules to `domains/` or ADRs to `brief.md`; write historical events under `history/events/YYYY/MM/` and update `history/domains/`, `history/topics/`, `history/months/`, and `history/index.md`; then compact context to a pointer.
- Topic indexes: when history exists but feature lookup is weak, create or update `history/topics/<topic>.md` using stable, generic topic names.
```

- [x] **Step 8: Update Workflow**

Replace Workflow steps with:

```markdown
1. Apply Repository Gate.
2. Select the smallest cleanup scope and read only files needed for it.
3. Run Cleanup Candidate Check.
4. Run Retention Review for each candidate.
5. Classify candidates.
6. Apply safe, evidence-backed `PROMOTE_DOMAIN`, `PROMOTE_HISTORY`, `PROMOTE_BOTH`, `COMPACT_TO_POINTER`, and `SUPERSEDE` changes when meaning is preserved.
7. For `DELETE_CANDIDATE`, present a deletion proposal and wait.
8. Delete only explicitly confirmed IDs.
9. Report files read, files changed, promotions, pointer compactions, superseded rules, topic indexes, proposed deletions, and confirmed deletions.
10. If nothing changed, report the blocking reason or that no worthwhile cleanup candidate was found.
```

- [x] **Step 9: Verify clean text**

Run:

```bash
rg -n "Cleanup Candidate Check|PROMOTE_DOMAIN|PROMOTE_HISTORY|PROMOTE_BOTH|COMPACT_TO_POINTER|history-topic-index|fixed line count|Size alone is not a cleanup trigger" skills/memory-clean/SKILL.md
```

Expected: all terms appear.

Also run:

```bash
rg -n "200-300|300 行|400|line count.*trigger|exceeding" skills/memory-clean/SKILL.md
```

Expected: no fixed threshold remains.

## Task 7: Cross-File Consistency Verification

**Files:**
- Check: `skills/memory-setup/SKILL.md`
- Check: `skills/memory-load/SKILL.md`
- Check: `skills/memory-sync/SKILL.md`
- Check: `skills/memory-clean/SKILL.md`
- Check: `skills/memory-sync/references/history-events.md`
- Check: `skills/memory-sync/references/templates.md`

- [x] **Step 1: Check new history topic support is present everywhere**

Run:

```bash
rg -n "history/topics|History Topics|Topic Projection|history-topic-index" skills/memory-setup/SKILL.md skills/memory-load/SKILL.md skills/memory-sync/SKILL.md skills/memory-clean/SKILL.md skills/memory-sync/references/history-events.md skills/memory-sync/references/templates.md
```

Expected:

- `history/topics` appears in setup, load, sync, clean, and history-events reference.
- `History Topics` appears in setup, load, and sync.
- `Topic Projection` appears in `history-events.md`.
- `history-topic-index` appears in `memory-clean`.

- [x] **Step 2: Check old registry table is removed from root skill rules**

Run:

```bash
rg -n "Domain \\| Read When \\| Current File \\| History \\| Aliases \\| Related Domains \\| Status" skills/memory-setup/SKILL.md skills/memory-load/SKILL.md skills/memory-sync/SKILL.md skills/memory-clean/SKILL.md
```

Expected: no matches.

- [x] **Step 3: Check no project-specific sample topics remain in modified root files**

Run:

```bash
rg -n "ych|YCH|acggoods" skills/memory-setup/SKILL.md skills/memory-load/SKILL.md skills/memory-sync/SKILL.md skills/memory-clean/SKILL.md skills/memory-sync/references/history-events.md skills/memory-sync/references/templates.md
```

Expected: no matches.

- [x] **Step 4: Check fixed cleanup thresholds are absent**

Run:

```bash
rg -n "200-300|300 行|400 行|soft threshold|hard threshold|clearly exceeding" skills/memory-load/SKILL.md skills/memory-clean/SKILL.md
```

Expected: no matches.

- [x] **Step 5: Run release check and classify expected payload sync failure**

Run:

```bash
npm run check:release
```

Expected:

- If it passes, record that root skill files and `plugins/wingman` payload were already consistent.
- If it fails only because `plugins/wingman/...` payload copies are out of sync with root `skills/...`, record that as expected and do not expand this task to sync payload.
- If it fails for any other reason in the modified root files, fix the root issue before finishing.

- [x] **Step 6: Review diff**

Run:

```bash
git diff -- skills/memory-setup/SKILL.md skills/memory-load/SKILL.md skills/memory-sync/SKILL.md skills/memory-clean/SKILL.md skills/memory-sync/references/history-events.md skills/memory-sync/references/templates.md docs/superpowers/plans/2026-06-15-memory-skills-redesign.md
```

Expected:

- Diff is limited to the planned files.
- New rules are consistent with the spec.
- No tests or `plugins/wingman` files changed.

## Task 8: Commit

**Files:**
- Stage: all modified planned files.

- [x] **Step 1: Check status**

Run:

```bash
git status --short --untracked-files=all
```

Expected: only planned files are modified or untracked.

- [x] **Step 2: Stage planned files**

Run:

```bash
git add docs/superpowers/plans/2026-06-15-memory-skills-redesign.md skills/memory-setup/SKILL.md skills/memory-load/SKILL.md skills/memory-sync/SKILL.md skills/memory-clean/SKILL.md skills/memory-sync/references/history-events.md skills/memory-sync/references/templates.md
```

- [x] **Step 3: Commit**

Run:

```bash
git commit -m "docs: redesign memory skill rules"
```

- [x] **Step 4: Confirm clean worktree**

Run:

```bash
git status --short --untracked-files=all
```

Expected: clean worktree, unless `npm run check:release` surfaced expected out-of-scope payload sync differences that were deliberately left untouched.
