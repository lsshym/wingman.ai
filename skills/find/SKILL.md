# Find

Use this workflow before building a component, hook, or utility that may already
exist in the project.

`find` reads the registries created by `reg` and suggests reusable
implementations that match the current requirement.

## Command

```text
/find <requirement>
```

Examples:

```text
/find searchable paginated select
/find date formatting helper
```

## Empty Query

If the user does not provide a requirement, stop and ask for a specific feature
or behavior description.

## Read Registries

Read these files if they exist:

```text
.cursor/brain/ui-components.md
.cursor/brain/business-components.md
.cursor/brain/utils.md
```

Do not invent registry entries. If the registries are empty, say that no local
match was found.

## Match

Extract from the user request:

- UI pattern;
- behavior;
- state or data requirement;
- platform trait;
- utility purpose.

Compare those signals against each entry's tags, description, and interface.

Use simple match levels:

- **High**: core behavior and type both match.
- **Medium**: partial tag overlap or close semantic match.
- **Low**: weak match; usually mention only if no better option exists.

## Output

Return the top 1-3 matches in Chinese.

For each match include:

- name;
- match level and reason;
- path;
- key interface;
- a tiny usage example when obvious.

If no match is useful, say so clearly and suggest creating a new implementation.
