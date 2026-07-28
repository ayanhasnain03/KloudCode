# KloudCode

KloudCode is an AI-powered terminal coding assistant with a local TUI client, a Bun/Hono streaming API server, shared schemas, and a Prisma-backed database layer.

It lets you start coding sessions from the terminal, talk to supported LLMs, stream reasoning and responses live, inspect tool calls, and let the agent explore or modify a project depending on the selected mode.

## Features

- Terminal-first chat experience built with OpenTUI and React
- Create and revisit saved coding sessions
- Two agent modes:
  - **BUILD**: can read files, search code, write files, edit files, and run shell commands
  - **PLAN**: read-only analysis mode for exploration and implementation planning
- Live streaming responses over Server-Sent Events (SSE)
- Streaming of:
  - text deltas
  - reasoning/thought summaries
  - tool calls
  - tool results
- Session persistence with messages stored in PostgreSQL through Prisma
- Resume support for interrupted sessions
- Searchable dialogs in the CLI for:
  - agent/mode selection
  - model selection
  - session switching
  - theme switching
- Multiple built-in AI model options from OpenAI and Anthropic
- Themeable terminal UI
- Shared runtime validation with Zod across packages
- Sentry integration for server monitoring and error tracking

## Monorepo Structure

```text
.
├─ packages/
│  ├─ cli/       # Terminal UI client
│  ├─ server/    # Hono + Bun API and AI orchestration
│  ├─ database/  # Prisma schema, generated client, DB access
│  └─ shared/    # Shared model definitions and Zod schemas
├─ package.json
├─ bun.lock
└─ tsconfig.base.json
```

## Tech Stack

### Runtime and Language
- Bun
- TypeScript

### Frontend / CLI UI
- React
- React Router
- OpenTUI (`@opentui/core`, `@opentui/react`)
- `opentui-spinner`
- `date-fns`
- `pretty-ms`

### Backend
- Hono
- Server-Sent Events via `hono/streaming`
- AI SDK (`ai`)
- OpenAI provider SDK (`@ai-sdk/openai`)
- Anthropic provider SDK (`@ai-sdk/anthropic`)
- Sentry (`@sentry/bun`, `@sentry/hono`)

### Data Layer
- Prisma
- PostgreSQL
- `pg`
- `@prisma/adapter-pg`

### Validation and Shared Types
- Zod

## Packages

### `packages/cli`
Terminal application for interacting with KloudCode.

Key responsibilities:
- Renders the TUI app
- Handles routing between home, new session, and session screens
- Streams chat responses from the server
- Displays user, assistant, and error messages
- Shows reasoning blocks and tool activity in real time
- Provides searchable dialogs for modes, models, sessions, and themes

Important files:
- `packages/cli/src/index.tsx`
- `packages/cli/src/screens/home.tsx`
- `packages/cli/src/screens/new-session.tsx`
- `packages/cli/src/screens/session.tsx`
- `packages/cli/src/hooks/use-chat.ts`

### `packages/server`
Streaming API server that manages sessions, prompts, model resolution, and tool execution.

Key responsibilities:
- Exposes session routes and chat routes
- Streams AI output as SSE events
- Builds system prompts based on selected mode
- Resolves supported OpenAI and Anthropic models
- Creates the toolset available to the agent
- Persists assistant, user, and error messages
- Handles interrupted chat persistence
- Sends logs/errors to Sentry

Important files:
- `packages/server/src/index.ts`
- `packages/server/src/routes/chat.ts`
- `packages/server/src/routes/sessions.ts`
- `packages/server/src/system-prompt.ts`
- `packages/server/src/tools/index.ts`

### `packages/database`
Database package containing the Prisma schema and generated Prisma client.

Key responsibilities:
- Defines `Session` and `Message` models
- Stores session metadata like title and cwd
- Stores message role, model, mode, status, content, duration, and structured parts
- Generates Prisma client used by other packages

Important files:
- `packages/database/prisma/schema.prisma`
- `packages/database/src/client.ts`
- `packages/database/src/index.ts`

### `packages/shared`
Shared cross-package types and schemas.

Key responsibilities:
- Defines supported chat models and default model
- Defines message part schemas for reasoning, text, and tool calls
- Defines chat stream event schemas used by server and CLI

Important files:
- `packages/shared/src/models.ts`
- `packages/shared/src/schemas.ts`

## Supported Modes

### BUILD
BUILD mode is for execution. The agent can use read/write and shell tools to complete tasks inside the attached project.

Available capabilities:
- `readFile`
- `listDirectory`
- `grep`
- `glob`
- `writeFile`
- `editFile`
- `bash`

### PLAN
PLAN mode is for analysis only. The agent can inspect a codebase and produce a concrete implementation plan without modifying files.

Available capabilities:
- `readFile`
- `listDirectory`
- `grep`
- `glob`

## Built-in Tools

The server exposes a local project toolset to the model. Current tools include:

- `readFile`
- `listDirectory`
- `grep`
- `glob`
- `writeFile`
- `editFile`
- `bash`

These are enabled conditionally based on the selected mode.

## Supported Models

Defined in `packages/shared/src/models.ts`.

### Anthropic
- `claude-sonnet-4-6`
- `claude-haiku-4-5`
- `claude-opus-4-6`

### OpenAI
- `gpt-5.4`
- `gpt-5.4-mini`
- `gpt-5.4-nano`
- `gpt-4o-mini`
- `gpt-5-mini`
- `o4-mini`

Default model:
- `gpt-4o-mini`

## API Overview

### Session routes
Mounted under `/sessions`.

- `GET /sessions` — list sessions
- `GET /sessions/:id` — get a session with its messages
- `POST /sessions` — create a new session

### Chat routes
Mounted under `/chat`.

The chat API streams assistant output and tool activity via SSE. The codebase also includes session resume handling for interrupted conversations.

## Data Model

### Session
- `id`
- `userId`
- `title`
- `cwd`
- `createdAt`
- `updatedAt`

### Message
- `id`
- `sessionId`
- `role` (`USER`, `ASSISTANT`, `ERROR`)
- `status` (`COMPLETED`, `INTERRUPTED`)
- `model`
- `content`
- `parts` (JSON)
- `mode` (`BUILD`, `PLAN`)
- `duration`
- `createdAt`

## Streaming Events

The server and CLI share a typed event protocol for chat streaming.

Event types include:
- `text-delta`
- `reasoning-delta`
- `tool-call`
- `tool-result`
- `done`
- `error`

## Development

### Prerequisites
- Bun
- PostgreSQL
- API keys for the providers you want to use

### Install dependencies
```bash
bun install
```

### Run the server
```bash
bun run dev:server
```

### Run the CLI
```bash
bun run dev:cli
```

## Workspace Scripts

Root `package.json` scripts:

```json
{
  "dev:cli": "bun run --watch packages/cli/src/index.tsx",
  "dev:server": "bun run --hot packages/server/src/index.ts"
}
```

Package-specific scripts include:
- `packages/server`: `dev`, `build`, `start`
- `packages/database`: `db:generate`

## Notes

- The CLI talks to the server using a typed Hono client.
- The default API URL is `http://localhost:3000` unless `API_URL` is set.
- Session creation currently records the current working directory from the CLI process.
- Session records currently use a placeholder `userId` in the server route implementation.

## Roadmap Ideas

Potential next improvements for the project:
- Authentication and real user accounts
- Better environment setup documentation
- Explicit deployment instructions
- Test coverage for streaming and tool execution flows
- Session deletion/renaming
- Richer tool permissions and sandboxing
