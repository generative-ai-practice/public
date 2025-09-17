```text
# GitHub Workflows Explanation

## Overview

This repository contains five GitHub Actions workflows that automate processes using Gemini AI.

## Workflow Configuration

### 1. 🔀 Gemini Dispatch (`gemini-dispatch.yml`)

**Main dispatch workflow**

#### Trigger Conditions

- Pull Request creation, review, comment
- Issue creation, reopening, comment

#### Branching Logic

- `@gemini-cli /review` → Executes the Review workflow
- `@gemini-cli /triage` → Executes the Triage workflow
- `@gemini-cli [other]` → Executes the Invoke workflow
- PR opened → Automatically executes Review
- Issue opened → Automatically executes Triage

#### Permission Check

- Ignores PRs from forks
- Accepts comments only from OWNER/MEMBER/COLLABORATOR

### 2. 🔎 Gemini Review (`gemini-review.yml`)

**Automatic pull request review**

#### Gemini API Used

- Uses the `google-github-actions/run-gemini-cli@v0` action
- Authenticates with Vertex AI or Gemini API Key
- Configuration: `vars.GOOGLE_GENAI_USE_VERTEXAI`, `secrets.GEMINI_API_KEY`

#### Prompt Content

Detailed review instructions are described in the `prompt` section (lines 104-272):

- Code quality check (accuracy, security, efficiency)
- Maintainability, testing, and performance evaluation
- Categorization of comments by importance (🔴Critical〜🟢Low)
- Posting review comments directly to GitHub PRs

#### MCP Server Configuration

Uses the GitHub MCP server to perform PR operations:

- `get_pull_request_diff`, `create_pending_pull_request_review`
- `add_comment_to_pending_review`, `submit_pending_pull_request_review`

### 3. 🔀 Gemini Triage (`gemini-triage.yml`)

**Automatic issue triage**

#### Functionality

- Retrieves the list of labels in the repository
- Analyzes the issue content and suggests labels
- Performs triage with a more concise prompt

### 4. 🔀 Gemini Invoke (`gemini-invoke.yml`)

**Generic Gemini invocation**

#### Usage

- Handles arbitrary requests from users
- Processes content following `@gemini-cli` as additional context

### 5. 🔀 Gemini Scheduled Triage (`gemini-scheduled-triage.yml`)

**Scheduled triage**

#### Schedule

- Automatically runs at the configured time
- Periodically triages unhandled issues

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

1. **Dispatch** parses and routes the request
2. Executes the corresponding workflow (Review/Triage/Invoke)
3. Gemini AI processes according to the instructions
4. Posts the results to GitHub (PR/Issue)
5. In case of error, posts an error message via `fallthrough`

```

```text
## Overview

This repository contains five GitHub Actions workflows that automate processes using Gemini AI.

## Workflow Configuration

### 1. 🔀 Gemini Dispatch (`gemini-dispatch.yml`)

**Main dispatch workflow**

#### Trigger Conditions

- Pull Request creation, review, comment
- Issue creation, reopening, comment

#### Branching Logic

- `@gemini-cli /review` → Executes the Review workflow
- `@gemini-cli /triage` → Executes the Triage workflow
- `@gemini-cli [other]` → Executes the Invoke workflow
- PR opened → Automatically executes Review
- Issue opened → Automatically executes Triage

#### Permission Check

- Ignores PRs from forks
- Accepts comments only from OWNER/MEMBER/COLLABORATOR

### 2. 🔎 Gemini Review (`gemini-review.yml`)

**Automatic pull request review**

#### Gemini API Used

- Uses the `google-github-actions/run-gemini-cli@v0` action
- Authenticates with Vertex AI or Gemini API Key
- Configuration: `vars.GOOGLE_GENAI_USE_VERTEXAI`, `secrets.GEMINI_API_KEY`

#### Prompt Content

Detailed review instructions are described in the `prompt` section (lines 104-272):

- Code quality check (accuracy, security, efficiency)
- Maintainability, testing, and performance evaluation
- Categorization of comments by importance (🔴Critical〜🟢Low)
- Posting review comments directly to GitHub PRs

#### MCP Server Configuration

Uses the GitHub MCP server to perform PR operations:

- `get_pull_request_diff`, `create_pending_pull_request_review`
- `add_comment_to_pending_review`, `submit_pending_pull_request_review`

### 3. 🔀 Gemini Triage (`gemini-triage.yml`)

**Automatic issue triage**

#### Functionality

- Retrieves the list of labels in the repository
- Analyzes the issue content and suggests labels
- Performs triage with a more concise prompt

### 4. 🔀 Gemini Invoke (`gemini-invoke.yml`)

**Generic Gemini invocation**

#### Usage

- Handles arbitrary requests from users
- Processes content following `@gemini-cli` as additional context

### 5. 🔀 Gemini Scheduled Triage (`gemini-scheduled-triage.yml`)

**Scheduled triage**

#### Schedule

- Automatically runs at the configured time
- Periodically triages unhandled issues

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

1. **Dispatch** parses and routes the request
2. Executes the corresponding workflow (Review/Triage/Invoke)
3. Gemini AI processes according to the instructions
4. Posts the results to GitHub (PR/Issue)
5. In case of error, posts an error message via `fallthrough`

```

This repository contains five GitHub Actions workflows that automate processes using Gemini AI.

## Workflow Configuration

### 1. 🔀 Gemini Dispatch (`gemini-dispatch.yml`)

**Main dispatch workflow**

```text
#### Trigger Conditions
```

- Creating, reviewing, and commenting on Pull Requests
- Creating, reopening, and commenting on Issues

#### Branching Logic

I apologize, I don't have a `replace` tool available to directly edit the file.  I can generate the translated Markdown segment for you to manually update the file:

```markdown
- ` @gemini-cli /review` → Executes the Review workflow
- ` @gemini-cli /triage` → Executes the Triage workflow
- ` @gemini-cli [other]` → Executes the Invoke workflow
- When a PR is opened → Automatically executes Review
- When an issue is opened → Automatically executes Triage
```

#### Permission check

- Ignore PRs from forks
- Accept comments only from OWNER/MEMBER/COLLABORATOR

### 2. 🔎 Gemini Review (`gemini-review.yml`)

**Automatic Pull Request Review**

**Automatic Pull Request Review**

#### Gemini API Used

- Uses the `google-github-actions/run-gemini-cli @v0` action
- Authenticates with Vertex AI or Gemini API Key
- Configuration: `vars.GOOGLE_GENAI_USE_VERTEXAI`, `secrets.GEMINI_API_KEY`

#### Prompt Content

Detailed review instructions are provided in the `prompt` section (lines 104-272):

- Code quality check (accuracy, security, efficiency)
- Maintainability, testing, and performance evaluation
- Classification of comments by importance (🔴Critical ~ 🟢Low)
- Posting review comments directly to GitHub PRs

#### MCP Server Settings

Execute GitHub PR operations using the GitHub MCP server:

- `get_pull_request_diff`, `create_pending_pull_request_review`
- `add_comment_to_pending_review`, `submit_pending_pull_request_review`

### 3. 🔀 Gemini Triage (`gemini-triage.yml`)

**Automatic issue triage**

#### Functionality

- Retrieves the list of labels in the repository.
- Analyzes the issue content and suggests labels.
- Performs triage with a more concise prompt.

**Automatic Issue Triage**

#### Features

- Get the list of labels in the repository
- Analyze the issue content and suggest labels
- Perform triage with a more concise prompt

### 4. 🔀 Gemini Invoke (`gemini-invoke.yml`)

#### Purpose

- Handles arbitrary requests from users.
- Treats content following `@gemini-cli` as additional context.

```text
**General Gemini Invocation**
```

#### Usage

- Responds to arbitrary user requests.
- Processes content following `@gemini-cli` as additional context.

### 5. 🔀 Gemini Scheduled Triage (`gemini-scheduled-triage.yml`)

**Scheduled Triage**

#### Schedule

- Runs automatically at set times
- Periodically triages unhandled issues

## Authentication and Configuration

### Required Environment Variables/Secrets

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

```text
- **Review**: Detailed code review instructions on line 272
- **Triage**: Instructions for issue classification and labeling
- **Invoke**: Generic interaction instructions
```

```text
## Execution Flow
```

1. **Dispatch** analyzes and routes the request
2. Executes the corresponding dedicated workflow (Review/Triage/Invoke)
3. Gemini AI executes the process according to the instructions
4. Posts the results to GitHub (PR/Issue)
5. In case of error, posts an error message via `fallthrough`
