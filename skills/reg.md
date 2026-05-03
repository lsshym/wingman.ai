# Reg

Use this workflow to register one reusable component, hook, or utility after it
has proven useful in the current codebase.

The registry is a lightweight memory index. It helps future work find existing
implementations before creating new ones.

## Command

```text
/reg
/reg <component-or-path>
```

## Scope

Register exactly one target per run.

- If the user provides a path or name, use that exact target.
- If no target is provided, use the active file from the current context.
- Do not bulk-register multiple files unless the user explicitly asks for that.

## Safety Gates

Before writing anything:

1. Read the target source code.
2. Understand the exact props, parameters, return value, and behavior.
3. Read existing registry files if they exist.
4. Check whether the same path is already registered.

Do not infer behavior from the file name alone.

## Extract

Record these fields:

- **Name**: component, hook, function, or utility name.
- **Path**: import path or relative source path.
- **Tags**: 3-6 precise keywords for UI type, behavior, state, data, or platform traits.
- **Description**: 1-2 sentences describing what the implementation actually does.
- **Interface**: main props, parameters, and return values.

## Registry Files

Choose one destination:

```text
.cursor/brain/ui-components.md
.cursor/brain/business-components.md
.cursor/brain/utils.md
```

Use UI components for mostly presentational components.
Use business components for components with workflow, API, routing, or global
state behavior.
Use utils for hooks, helpers, and pure functions.

## Append Format

Append one block in Chinese:

```markdown
### [Name]
- **路径**: `Path`
- **特征/标签**: `[Tags]`
- **功能描述**: Description
- **核心接口**: Props or parameters
```

## Write Rules

- Append only.
- Do not overwrite registry files.
- Do not delete existing entries.
- Use path as the primary duplicate key.
- If the same path already exists, skip registration and report the duplicate.

## Confirm

Reply with the registered name, target registry file, and extracted tags.
