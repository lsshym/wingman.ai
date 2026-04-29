---
name: reuse-select
description: Select reusable project implementations from the Wingman reuse registry. Use when deciding whether to reuse, extend, wrap, or create components, modules, utilities, patterns, contracts, or prior implementations.
---

# Reuse Select

Use `.wingman/registry/` as an AI-readable selection map. Prefer index-first discovery, then read only the most relevant implementation cards.

## Trigger

Triggered when the user types `/reuse-select [requirement]`, asks whether an existing reusable implementation should be used, or uses legacy `/find`.

If the user provides no requirement, ask for the needed behavior, domain, or implementation type before searching.

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

Each implementation card should contain:

- `Source`
- `Status`
- `Last Verified`
- `Tags`
- `Best For`
- `What It Does`
- `Use When`
- `Do Not Use When`
- `Interface`
- `Similar Implementations`
- `Selection Notes`

## Lookup Workflow

1. Check whether `.wingman/registry/` exists.
2. If the registry does not exist, say no Wingman reuse registry exists yet. Offer to continue with source-code search if useful, but do not present source-search results as registry results. Suggest `reuse-catalog` for confirmed reusable implementations.
3. Read `.wingman/registry/index.md` first when it exists.
4. If `index.md` does not exist, fall back to legacy registry files if present:
   - `.wingman/registry/ui-components.md`
   - `.wingman/registry/business-components.md`
   - `.wingman/registry/utils.md`
5. Extract the user's required behavior, domain, interface needs, platform constraints, and deal-breakers.
6. From the index, choose up to 5 candidate cards by `Tags`, `Best For`, `Source`, category, and `Status`.
7. If the index exists but candidate coverage is weak, the user asks for a broad/full search, or legacy registry files may contain relevant older entries, read the legacy files as supplemental evidence.
8. Read only the selected candidate cards.
9. Compare `Status`, `Last Verified`, `Use When`, `Do Not Use When`, `Interface`, `Similar Implementations`, and `Selection Notes`.
10. Decide whether to reuse, extend, wrap, or create a new implementation.

Do not read every card unless the index is missing, stale, or clearly insufficient.
Clearly label any recommendation based on legacy registry files rather than a modern implementation card.

## Decision Criteria

Prefer reuse when:

- status is `Preferred` or `Stable`, or the card explains why another status still fits
- required behavior matches `Use When`
- no deal-breaker appears in `Do Not Use When`
- interface can be used without semantic adapters or fake data
- selection notes recommend the implementation for this case

Prefer extending an implementation when:

- the existing implementation owns the same semantic responsibility
- the new need is a natural option or variation
- the extension will not make the implementation ambiguous

Prefer wrapping an implementation when:

- the base implementation is correct but the current context needs domain defaults, permissions, tracking, or layout composition

Prefer creating a new implementation when:

- all candidates are semantically different
- reuse would require misleading props, fake fields, or unrelated behavior
- the need appears repeatedly enough to justify a reusable abstraction

## Output

Return the top recommendation first:

```markdown
Recommended: `[ImplementationName]`

Decision: Reuse | Extend | Wrap | Create New

Why:
- [Reason tied to the card.]

Not Chosen:
- `[OtherImplementation]`: [Specific mismatch or distinction.]

Use:
- Card: `.wingman/registry/[category]/[implementation].md`
- Source: `[source path]`
- Status: `[Preferred | Stable | Experimental | Legacy | Deprecated | Unknown]`

Notes:
- [Any caveat, missing registry info, or suggested follow-up registration.]
```

If no good match exists, say so directly and explain what new implementation should be created and which existing implementations it must not overlap with.
