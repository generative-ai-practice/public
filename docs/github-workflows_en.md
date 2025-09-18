# GitHub Workflows Explanation

## Overview

This repository contains five GitHub Actions workflows that automate processes using Gemini AI.

## Workflow Configuration

### 1. 🔀 Gemini Dispatch (`gemini-dispatch.yml`)

**Main dispatch workflow**

#### Trigger conditions

- Creating, reviewing, and commenting on Pull Requests
- Creating, reopening, and commenting on Issues

#### Conditional Branching

- ` @gemini-cli /review` → Runs the Review workflow
- ` @gemini-cli /triage` → Runs the Triage workflow
- ` @gemini-cli [other]` → Runs the Invoke workflow
- When a PR is opened → Automatically runs Review
- When an issue is opened → Automatically runs Triage

#### Permission check

- Ignore PRs from forks
- Accept comments only from OWNER/MEMBER/COLLABORATOR

### 2. 🔎 Gemini Review (`gemini-review.yml`)

**Automatic Pull Request Review**

#### Gemini API to use

- Uses the `google-github-actions/run-gemini-cli @v0` action
- Authenticates with Vertex AI or Gemini API Key
- Configuration: `vars.GOOGLE_GENAI_USE_VERTEXAI`, `secrets.GEMINI_API_KEY`

#### Prompt Content

Detailed review instructions are provided in the `prompt` section (lines 104-272):

- Code quality check (accuracy, security, efficiency)
- Maintainability, testing, and performance evaluation
- Categorization of comments by importance (🔴Critical ~ 🟢Low)
- Posting review comments directly to GitHub PRs

#### MCP Server Settings

Execute PR operations using GitHub's MCP server:

- `get_pull_request_diff`, `create_pending_pull_request_review`
- `add_comment_to_pending_review`, `submit_pending_pull_request_review`

### 3. 🔀 Gemini Triage (`gemini-triage.yml`)

**Automatic issue triage**

#### Features

- Get a list of labels in the repository
- Analyze the issue content and suggest labels
- Perform triage with a more concise prompt

### 4. 🔀 Gemini Invoke (`gemini-invoke.yml`)

**Generic Gemini invocation**

#### Usage

- Respond to any requests from the user
- Treat the content following ` @gemini-cli` as additional context

### 5. 🔀 Gemini Scheduled Triage (`gemini-scheduled-triage.yml`)

**Regularly scheduled triage**

#### Schedule

- Automatic execution at set times
- Regularly triage unsupported issues

## Authentication and Configuration

### Required environment variables/secrets

- `vars.APP_ID`, `secrets.APP_PRIVATE_KEY` - GitHub App authentication
- `secrets.GEMINI_API_KEY` or `secrets.GOOGLE_API_KEY` - Gemini API
- `vars.GCP_WIF_PROVIDER`, `vars.GOOGLE_CLOUD_PROJECT` - For Vertex AI
- `vars.SERVICE_ACCOUNT_EMAIL` - GCP service account

### Gemini Configuration

- Vertex AI usage: `vars.GOOGLE_GENAI_USE_VERTEXAI`
- Code Assist usage: `vars.GOOGLE_GENAI_USE_GCA`
- Debug mode: `vars.DEBUG`

## Prompt Location

Detailed instructions are provided in the `prompt` section of each workflow file:

- **Review**: Detailed code review instructions on line 272
- **Triage**: Instructions for issue classification and labeling
- **Invoke**: Generic interactive instructions

## Execution Flow

1. **Dispatch** analyzes and routes the request
2. Executes the corresponding dedicated workflow (Review/Triage/Invoke)
3. Gemini AI executes the processing according to the instructions
4. Posts the results to GitHub (PR/Issue)
5. In case of error, posts an error message via `fallthrough`
