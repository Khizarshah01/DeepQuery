# DeepQuery

DeepQuery is our full-stack AI research chat product for turning web context into structured, conversational answers. It combines authenticated conversations, live web search, streamed AI responses, and asynchronous research jobs powered by a Redis-backed worker queue.

We aim to make research feel like a focused workspace rather than a one-off chatbot: users can ask quick questions, continue earlier threads, and send longer research tasks into a background worker without leaving the chat.

## Features

- AI chat with streamed responses
- Web search context using Tavily
- Conversation history saved in Postgres
- Supabase authentication
- Research Mode with Redis + BullMQ background jobs
- Worker process for long-running research tasks
- Research job status polling and persisted results
- Optional webhook configuration for completed research jobs
- React frontend with dark mode and markdown rendering
- Prisma ORM with PostgreSQL

## Tech Stack

- Frontend: React, TypeScript, Tailwind CSS, Bun
- Backend: Bun, Express, TypeScript
- Database: PostgreSQL, Prisma
- Auth: Supabase
- AI: Google Gemini
- Search: Tavily
- Queue: Redis, BullMQ, ioredis

## Architecture

```txt
frontend/
  React
  Supabase login
  Research Mode polling

backend/
  Express API
  Prisma database access
  Tavily search
  Gemini response generation
  BullMQ queue producer

backend/worker.ts
  BullMQ worker
  Processes async research jobs
  Saves completed results to chat history

Redis
  Queue backend for BullMQ

Postgres
  Users, conversations, messages, research jobs, webhook configs
```

<img width="2166" height="1180" alt="Screenshot from 2026-06-14 22-46-54" src="https://github.com/user-attachments/assets/85bdd0e8-0f82-4bad-85d8-f286c98378e9" />


## Main API Flows

Normal chat:

```txt
User message -> /ask -> Tavily search -> Gemini stream -> save conversation
```

Research Mode:

```txt
User message -> /research -> create ResearchJob -> BullMQ queue
Worker -> Tavily search -> Gemini answer -> save result -> frontend polls status
```

Research Mode is currently an async/background research workflow. It is not yet a full autonomous multi-step research agent.

## Getting Started

### Prerequisites

- Bun
- PostgreSQL database
- Redis
- Supabase project
- Tavily API key
- Google Gemini API key

### 1. Clone and install

```bash
git clone <url>
cd deepquery
```

Install backend dependencies:

```bash
cd backend
bun install
```

Install frontend dependencies:

```bash
cd ../frontend
bun install
```

### 2. Configure environment variables

Create `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SECRET_KEY_BASE="your-supabase-service-role-or-secret-key"
GEMINI_API_KEY="your-gemini-api-key"
TAVILY_API_KEY="your-tavily-api-key"
REDIS_URL="redis://127.0.0.1:6379"
```

Create `frontend/.env`:

```env
BUN_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
```

The frontend backend URL is currently configured in:

```txt
frontend/src/lib/config.ts
```

Default:

```ts
export const BACKEND_URL = "http://localhost:3001";
```

### 3. Setup the database

From `backend/`:

```bash
bunx prisma generate
bunx prisma db push
```

Use migrations instead of `db push` if you prefer a migration-based workflow.

### 4. Start Redis

Using Docker:

```bash
docker run --name deepquery-redis -p 6379:6379 -d redis:7-alpine
```

### 5. Run the backend API

From `backend/`:

```bash
bun run start
```

The API runs on:

```txt
http://localhost:3001
```

### 6. Run the research worker

Open a second terminal:

```bash
cd backend
bun run worker
```

The worker must be running for Research Mode jobs to complete.

### 7. Run the frontend

Open a third terminal:

```bash
cd frontend
bun run dev
```

## About DeepQuery

DeepQuery is a production-minded research platform that delivers web-grounded answers, persistent conversation history, and scalable background research jobs. It is designed for teams and users who need reliable, composable research workflows.

## Current Limitations

- Research Mode is async and queue-based, but not yet a true multi-step research agent.

## Future Improvements

- Multi-step research planning with generated subqueries
- Multiple Tavily searches per research job
