# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a TypeScript/JavaScript repository for "Generative AI Practice" with documentation translation capabilities. The project includes a translation workflow system that can automatically translate Markdown documentation between languages using Gemini AI.

## Development Commands

Essential commands for development:

```bash
# Code quality and formatting
yarn lint                    # Run ESLint on src/**/*.{js,jsx,ts,tsx}
yarn lint:fix               # Run ESLint with --fix flag
yarn format                 # Format code using Prettier
yarn format:check           # Check code formatting without changes
yarn typecheck              # Run TypeScript type checking

# Translation workflow
yarn translate              # Run the translation system
yarn translate:dry-run      # Preview what would be translated without making changes
```

## Translation System Architecture

The main feature is an automated documentation translation system (`scripts/translate-docs.ts`) that:

- Reads translation targets from `translations/targets.csv`
- Uses segment-based translation with content hashing for efficiency
- Stores translation metadata in `.translations.json` for incremental updates
- Integrates with Gemini AI CLI for translations
- Supports multiple target languages with reuse of existing translations

Key configuration:
- Translation targets: `translations/targets.csv` (CSV with relative_path, src_lang, target_langs)
- Translation metadata: `.translations.json` (tracks hashes and translations)
- Allowed languages: `TRANSLATION_ALLOWED_LANGUAGES` env var (default: "en,ja")
- Translation command: `GEMINI_TRANSLATION_CLI` env var (default uses gemini CLI)

The system intelligently handles:
- Full file translation for new documents
- Segment-level updates for modified content
- Translation reuse based on content hashes
- Multi-paragraph document structure preservation
