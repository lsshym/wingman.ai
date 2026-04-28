---
name: find
description: Find reusable assets in the Wingman registry. Use when deciding whether to reuse, extend, wrap, or create components, modules, utilities, patterns, contracts, or prior implementations.
---

# Command: Find Asset

Use `.wingman/registry/` as an AI-readable selection map. Prefer index-first discovery, then read only the most relevant asset cards.

## Trigger

Triggered when the user types `/find [requirement]` or asks whether an existing reusable asset should be used.

If the user provides no requirement, ask for the needed behavior, domain, or asset type before searching.

## Language

Registry field headings are English for stable parsing. Respond in the configured memory language when known, otherwise follow the user's current language, then English.

## Registry Shape

Expected layout:

```text
.wingman/registry/
  index.md
  components/
  modules/
  utilities/
  patterns/
  contracts/
```

Each asset card should contain:

- `Source`
- `Tags`
- `Best For`
- `What It Does`
- `Use When`
- `Do Not Use When`
- `Interface`
- `Similar Assets`
- `Selection Notes`

## Lookup Workflow

1. Read `.wingman/registry/index.md` first.
2. If `index.md` does not exist, fall back to legacy registry files if present:
   - `.wingman/registry/ui-components.md`
   - `.wingman/registry/business-components.md`
   - `.wingman/registry/utils.md`
3. Extract the user's required behavior, domain, interface needs, platform constraints, and deal-breakers.
4. From the index, choose up to 5 candidate cards by `Tags`, `Best For`, `Source`, and category.
5. Read only those candidate cards.
6. Compare `Use When`, `Do Not Use When`, `Interface`, `Similar Assets`, and `Selection Notes`.
7. Decide whether to reuse, extend, wrap, or create a new asset.

Do not read every card unless the index is missing, stale, or clearly insufficient.

## Decision Criteria

Prefer reuse when:

- required behavior matches `Use When`
- no deal-breaker appears in `Do Not Use When`
- interface can be used without semantic adapters or fake data
- selection notes recommend the asset for this case

Prefer extending an asset when:

- the existing asset owns the same semantic responsibility
- the new need is a natural option or variation
- the extension will not make the asset ambiguous

Prefer wrapping an asset when:

- the base asset is correct but the current context needs domain defaults, permissions, tracking, or layout composition

Prefer creating a new asset when:

- all candidates are semantically different
- reuse would require misleading props, fake fields, or unrelated behavior
- the need appears repeatedly enough to justify a reusable abstraction

## Output

Return the top recommendation first:

```markdown
Recommended: `[AssetName]`

Decision: Reuse | Extend | Wrap | Create New

Why:
- [Reason tied to the card.]

Not Chosen:
- `[OtherAsset]`: [Specific mismatch or distinction.]

Use:
- Card: `.wingman/registry/[category]/[asset].md`
- Source: `[source path]`

Notes:
- [Any caveat, missing registry info, or suggested follow-up registration.]
```

If no good match exists, say so directly and explain what new asset should be created and which existing assets it must not overlap with.
