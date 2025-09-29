# Agent Guide

This guide summarizes the shared context and expectations for AI coding partners such as Claude Code, GitHub Copilot / Codex, and Gemini Code Assist when working in this repository. Treat the instructions below as canonical regardless of which model is active.

## Repository Overview

This project is a TypeScript/JavaScript monorepo for "Generative AI Practice". It contains:

- Application code under `src/` and accompanying documentation in `docs/`
- A translation workflow that keeps `README_original.md` and localized copies like `README_en.md` in sync
- Automation scripts in `scripts/` to assist with translation, guide synchronization, and other maintenance tasks

## Core Development Commands

Use the Yarn scripts to maintain consistent tooling across agents:

```bash
# Code quality and formatting
yarn lint              # Run ESLint on src/**/*.{js,jsx,ts,tsx}
yarn lint:fix          # Run ESLint with automatic fixes
yarn format            # Format code using Prettier
yarn format:check      # Verify formatting without modifying files
yarn typecheck         # Run the TypeScript compiler in type-check mode

yarn test              # (If available) execute unit or integration tests

# Translation workflow
yarn translate         # Run the documentation translation pipeline
yarn translate:dry-run # Preview translation changes without writing files

# Agent guide synchronization
yarn sync:agents       # Mirror CLAUDE.md content into AGENTS.md
```

Always run `yarn sync:agents` after updating this guide so both files stay identical. CI will fail if `CLAUDE.md` and `AGENTS.md` diverge.

## Translation System Snapshot

The translation pipeline (`scripts/translate-docs.ts`) performs segment-based Markdown translation with Gemini AI. Important pieces:

- Targets are declared in `translations/targets.csv` (columns: `relative_path`, `src_lang`, `target_langs`).
- Translation metadata lives in `.translations.json`, enabling incremental updates.
- Allowed languages are controlled via the `TRANSLATION_ALLOWED_LANGUAGES` environment variable (default: `en,ja`).
- Gemini CLI invocation can be overridden with `GEMINI_TRANSLATION_CLI`.

The script intelligently skips already translated segments, reuses hashes, and preserves paragraph structure. Review translation diffs carefully before committing.

## Collaboration Tips for All Agents

- Prefer clear, incremental commits and keep TypeScript types accurate.
- Update or add tests when changing behavior; surface the exact command run in the final report.
- When modifying documentation, ensure localized copies stay consistent using the translation workflow.
- Respect existing coding conventions—no implicit any, no unused variables, and follow Prettier/ESLint defaults.
- Surface limitations explicitly if a task cannot be completed due to environment constraints.

Following these shared practices ensures a consistent experience no matter which assistant is participating in the development loop.
