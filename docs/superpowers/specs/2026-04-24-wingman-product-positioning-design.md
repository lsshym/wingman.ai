# Wingman Product Positioning And Content Layer Design

## Overview

This document defines the next-stage product positioning and content design for `wingman`.

The repository has already completed its structural migration into a shared-core plugin package with platform wrappers. The next problem is no longer directory shape. The next problem is product clarity:

- what `wingman` is
- how its capabilities should be grouped
- which capabilities form the main public story
- how naming and frontmatter should support discoverability without overpromising

This stage is a product and content design pass. It is not an implementation rewrite of the prompt bodies.

## Product Definition

`wingman` should be positioned as:

> A cross-platform AI engineering plugin for execution, context, and reuse.

This means:

- `wingman` is not a Cursor-only plugin
- `wingman` is not only a memory system
- `wingman` is not just a loose prompt collection
- `wingman` is a shared capability package with thin platform wrappers

The primary public identity is a general-purpose engineering plugin. Platform support is a distribution concern, not the main product story.

## Core Positioning

The main public promise should be:

- practical engineering execution tools
- optional but powerful context management for long-running work
- reusable project asset registration and retrieval

The product should not imply that every project must adopt the heavier context workflow. That workflow is valuable, but it is most appropriate for repositories with long duration, more collaborators, or higher context complexity.

## Capability Taxonomy

`wingman` should group its capabilities into three product-facing layers.

### 1. Core Engineering

These capabilities are the easiest to understand and should lead the public story:

- `api-bind`
- `zod-gen`
- `refactor`
- `refactor-types`

They represent direct engineering execution:

- integrating APIs
- generating validation and types
- diagnosing or restructuring code

This layer should be the first thing a new user sees.

### 2. Advanced Context

These capabilities are still general-purpose, but they are better suited for projects with longer timelines or more context complexity:

- `memory-setup`
- `memory-sync`

This layer should be described as advanced context infrastructure rather than as the core identity of the product.

Important nuance:

- these capabilities are not niche or private-only
- they are broadly useful
- but they should not be presented as mandatory for every simple project

### 3. Project Registry

These capabilities should be treated as a separate reuse system:

- `reg`
- `find`

They should not be framed as memory-system helpers.

Their value is:

- registering reusable project assets
- retrieving existing assets for reuse

This is a distinct workflow centered on reuse and discoverability rather than context continuity.

## Product Narrative

The public product narrative should follow this order:

1. `wingman` is a cross-platform engineering plugin.
2. It helps with execution, context, and reuse.
3. Its easiest entry points are direct engineering capabilities.
4. It also includes advanced context workflows for repositories that need durable project memory.
5. It includes a registry workflow for teams that want reusable asset lookup.

This order matters because it keeps the first impression lightweight and broadly useful, while still preserving the project's differentiators.

## Naming Strategy

### Current Problem

The current command naming language is inconsistent:

- some names are technical action labels
- some names are workflow names
- some are abbreviations
- some are too generic

This creates the impression of an internal toolbox instead of a coherent product.

### Memory Workflow Naming

The previous `/init` name is too broad and ambiguous because it does not tell users what is being initialized.

The approved naming direction is:

- `/memory-setup`
- `/memory-sync`

#### `/memory-setup`

This name should mean:

- initialize the memory workflow
- create the required files and structure
- establish the memory-system foundation for the repository

It is preferable to `/init` because it makes the target system explicit.

#### `/memory-sync`

This name should mean:

- manually sync project state into the memory workflow
- record new progress when needed
- update the working memory state when users want an explicit refresh

This name is preferred over `/memo` because it is clearer, less internal-sounding, and better aligned with `/memory-setup`.

### Registry Naming

`reg` and `find` may remain in place for now, but they should be documented as registry capabilities rather than memory capabilities.

Future naming cleanup can revisit whether `reg` should be expanded, but that is not required for the next stage.

## README Information Architecture

The README should be reorganized around product understanding rather than around raw file structure.

Recommended order:

1. One-sentence product definition
2. Three capability groups:
   - Core Engineering
   - Advanced Context
   - Project Registry
3. Short explanation of when to use the advanced context workflow
4. Shared core plus platform shell packaging model
5. Public command list
6. Directory structure

### Recommended First-Line Positioning

The README opening should clearly state that `wingman` is a cross-platform engineering plugin and should not lead with Cursor-specific identity.

### Recommended Context Guidance

The README should explicitly say that the advanced context workflow is best for:

- long-running repositories
- collaborative work
- codebases where context continuity matters

This prevents accidental overstatement that every project should adopt it by default.

## Frontmatter Strategy

The current structural migration added frontmatter, but discoverability quality depends on better `description` writing.

Each `description` should follow this pattern:

> What it does. Use when X, Y, or Z.

This guidance applies to both skills and commands.

### Good Description Qualities

- explains the outcome
- explains when to invoke it
- avoids internal shorthand
- stays product-facing instead of team-internal

### Examples Of Intent

The exact text can vary, but the intent should be:

- `api-bind`: use when binding backend payloads to existing UI components
- `memory-setup`: use when a repository needs durable working context
- `memory-sync`: use when users want to sync progress, decisions, or updates into the memory workflow
- `reg`: use when cataloging reusable assets
- `find`: use when searching for existing reusable assets

## Shared Core Versus Platform Semantics

The repository structure is now largely platform-neutral, but much of the content layer still contains Cursor-specific assumptions.

Examples include:

- `.cursor/...` paths
- active-file assumptions
- Cursor planning terminology
- Cursor-specific rule precedence language

These assumptions should not be treated as the product's core identity.

The intended long-term split is:

- shared intent layer: task purpose, output contract, decision rules, usage conditions
- platform semantics layer: editor context, file discovery assumptions, path conventions, trigger mechanics

The next content pass does not need to fully rewrite every body, but it should begin identifying which instructions belong to each layer.

## Priority Problems

The most important problems are not missing features. They are product-language and expectation-management problems.

### 1. Naming Inconsistency

The command set still mixes abbreviations, broad labels, and technical terms in a way that weakens product coherence.

### 2. Weak Discoverability Copy

Frontmatter exists, but much of it still needs stronger product-grade intent descriptions to improve recognition and future portability.

### 3. Platform-Specific Leakage

The shared core still contains platform-private assumptions that make the project look less cross-platform than its packaging suggests.

### 4. Missing Capability Grouping In Public Docs

The capability grouping discussed in design does not yet fully exist in the public-facing documentation.

### 5. Risk Of Mismanaged Expectations

Users may misunderstand:

- whether memory is required for every project
- whether registry tools are part of the memory workflow
- whether cross-platform means identical runtime behavior on every platform

These expectations must be managed explicitly in docs and naming.

## Recommended Execution Order

The next work should be prioritized in this order:

1. unify the public command naming language
2. rewrite frontmatter descriptions for product-grade discovery
3. update the README to use the three-group capability model
4. audit content bodies for platform-specific assumptions and mark what belongs to shared intent versus platform semantics

This order is recommended because it improves product clarity and discoverability before attempting deeper prompt rewrites.

## Scope Boundaries

This design does not require:

- rewriting the core strategy logic of every prompt
- removing all Cursor-specific content immediately
- splitting the repository into multiple packages
- changing the fundamental shared-core packaging model

## Success Criteria

This design stage is successful when:

1. `wingman` is clearly described as a cross-platform engineering plugin rather than a Cursor-only bundle.
2. The product story is led by Core Engineering, not by the memory system alone.
3. `memory-setup` and `memory-sync` are treated as advanced context capabilities with clearer naming.
4. `reg` and `find` are documented as registry capabilities rather than memory helpers.
5. The next implementation pass has a clear order of operations for naming, frontmatter, README grouping, and content-layer cleanup.
