# GitHub Workflows Explanation

## Overview

This repository contains five GitHub Actions workflows that automate processes using Gemini AI. A detailed explanation of the document translation pipeline is also provided in `docs/translation-workflow.md`. The CI pipeline additionally checks that the agent guides (`CLAUDE.md` and `AGENTS.md`) remain synchronized.

## Workflow Configuration

### 1. 🔀 Gemini Dispatch (`gemini-dispatch.yml`)

**Main dispatch workflow**

#### Trigger Conditions

- Pull Request creation, review, comment
- Issue creation, reopening, comment

#### Operational Branching

- ` @gemini-cli /review` → Executes the Review workflow
- ` @gemini-cli /triage` → Executes the Triage workflow
- ` @gemini-cli [other]` → Executes the Invoke workflow
- PR opened → Automatically executes Review
- Issue opened → Automatically executes Triage

#### Permission Check

- Ignores PRs from forks
- Only accepts comments from OWNER/MEMBER/COLLABORATOR

### 2. 🔎 Gemini Review (`gemini-review.yml`)

**Automatic pull request review**

#### Gemini API Used

- Uses the `google-github-actions/run-gemini-cli @v0` action
- Authenticates with Vertex AI or Gemini API Key
- Settings: `vars.GOOGLE_GENAI_USE_VERTEXAI`, `secrets.GEMINI_API_KEY`

#### Prompt Content

Detailed review instructions are described in the `prompt` section (lines 104-272):

- Code quality check (accuracy, security, efficiency)
- Maintainability, testing, and performance evaluation
- Categorization of comments by importance (🔴Critical〜🟢Low)
- Posting review comments directly to GitHub PRs

#### MCP Server Settings

Uses the GitHub MCP server to perform PR operations:

- `get_pull_request_diff`, `create_pending_pull_request_review`
- `add_comment_to_pending_review`, `submit_pending_pull_request_review`

### 3. 🔀 Gemini Triage (`gemini-triage.yml`)

**Automatic issue triage**

#### Functionality

- Retrieves the list of labels for the repository
- Analyzes the issue content and suggests labels
- Performs triage with a more concise prompt

### 4. 🔀 Gemini Invoke (`gemini-invoke.yml`)

**Generic Gemini invocation**

#### Usage

- Handles arbitrary requests from users
- Processes content following ` @gemini-cli` as additional context

### 5. 🔀 Gemini Scheduled Triage (`gemini-scheduled-triage.yml`)

**Triage with scheduled execution**

#### Schedule

- Automatically runs at the configured time
- Periodically triages unhandled issues

### 6. ✅ Agent Guide Sync Check (step in `ci.yml`)

**Ensures `CLAUDE.md` and `AGENTS.md` stay in sync**

#### Role

- Runs `yarn sync:agents` to detect missed local synchronizations
- Uses `git diff --exit-code CLAUDE.md AGENTS.md` to verify both files match and fails the job if they do not
- Outputs a clear failure message instructing contributors to run `yarn sync:agents`

#### Background

- `CLAUDE.md` serves as the canonical source; developers run `yarn sync:agents` locally to copy it into `AGENTS.md`
- When only one of the files is edited, the CI check immediately flags the drift
- After updating `CLAUDE.md`, always run `yarn sync:agents` and commit both files together

## Authentication and Configuration

### Required Environment Variables/Secrets

- `vars.APP_ID`, `secrets.APP_PRIVATE_KEY` - GitHub App authentication
- `secrets.GEMINI_API_KEY` or `secrets.GOOGLE_API_KEY` - Gemini API
- `vars.GCP_WIF_PROVIDER`, `vars.GOOGLE_CLOUD_PROJECT` - For Vertex AI
- `vars.SERVICE_ACCOUNT_EMAIL` - GCP service account

### Gemini Configuration

- Using Vertex AI: `vars.GOOGLE_GENAI_USE_VERTEXAI`
- Using Code Assist: `vars.GOOGLE_GENAI_USE_GCA`
- Debug Mode: `vars.DEBUG`

## Prompt Location

Detailed instructions are described in the `prompt` section of each workflow file:

- **Review**: Detailed code review instructions (272 lines)
- **Triage**: Instructions for issue classification and labeling
- **Invoke**: Generic interaction instructions

## Execution Flow

1. **Dispatch** analyzes and routes the request
2. Executes the corresponding workflow (Review/Triage/Invoke)
3. Gemini AI processes according to the instructions
4. Posts the results to GitHub (PR/Issue)
5. In case of error, posts an error message via `fallthrough`
