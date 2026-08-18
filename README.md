# DeepQuery

A full-stack AI research workspace. Ask a question, get a web-grounded answer streamed into chat, and keep the thread. For longer jobs, Deep Search queues work on Redis and a background worker so the UI stays responsive.

The live demo is for chatting and auth. Deep Search needs Redis + a worker, so it runs in a local clone.

https://github.com/user-attachments/assets/d91d3b52-4f66-4e76-aec0-c55860a35a30

## Features

- Streamed AI chat with Gemini
- Live web context from Tavily
- Google and GitHub sign-in via Supabase
- Conversation history in Postgres
- Deep Search: async research jobs on Redis + BullMQ
- Worker that writes completed answers back into the thread
- Dark mode, markdown answers, and source links

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React, TypeScript, Tailwind, Bun |
| Backend | Bun, Express, TypeScript |
| Database | PostgreSQL, Prisma |
| Auth | Supabase (Google + GitHub) |
| Models | Google Gemini |
| Search | Tavily |
| Queue | Redis, BullMQ |

## Architecture

This is the uploaded diagram. GitHub shows it as an image — you do not need extra software.

<img width="2166" height="1180" alt="DeepQuery architecture" src="https://github.com/user-attachments/assets/85bdd0e8-0f82-4bad-85d8-f286c98378e9" />

Normal chat:

```txt
message → /ask → Tavily → Gemini stream → save conversation
```

Deep Search (local):

```txt
message → /research → ResearchJob + BullMQ
worker  → Tavily → Gemini → save result → UI polls status
```

## Live demo vs local

| | Live site | Local clone |
| --- | --- | --- |
| Google / GitHub login | Yes | Yes |
| Skip-login test user | Hidden | http://localhost:3000/local |
| Streamed chat | Yes | Yes |
| Deep Search | Shows a “clone the repo” note | Full worker pipeline |

The skip-login button and `/local` route only appear on `localhost`. Production visitors only see Google and GitHub.

## Getting started

### Prerequisites

- [Bun](https://bun.sh)
- Docker Desktop (Postgres + Redis)
- A [Supabase](https://supabase.com) project
- [Tavily](https://app.tavily.com/home) API key
- [Gemini](https://aistudio.google.com/apikey) API key

### 1. Clone and install

```bash
git clone https://github.com/Khizarshah01/deepquery.git
cd deepquery

cd backend && bun install
cd ../frontend && bun install
```

### 2. Start Postgres and Redis

From the repo root:

```bash
docker compose up -d
```

This starts:

- Postgres at `postgresql://deepquery:deepquery@127.0.0.1:5462/deepquery`
- Redis at `redis://127.0.0.1:6382`

Those ports avoid clashing with other local Docker apps.

### 3. Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env`:

```env
DATABASE_URL="postgresql://deepquery:deepquery@127.0.0.1:5462/deepquery"
REDIS_URL="redis://127.0.0.1:6382"
PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SECRET_KEY_BASE="your-supabase-service-role-key"
GEMINI_API_KEY="your-gemini-api-key"
TAVILY_API_KEY="your-tavily-api-key"
```

`frontend/.env`:

```env
BUN_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
BUN_PUBLIC_BACKEND_URL="http://localhost:3001"
```

In Supabase → Authentication → URL Configuration, add:

```txt
http://localhost:3000
http://localhost:3000/**
```

plus your live site URLs. Google’s callback stays:

```txt
https://YOUR-PROJECT.supabase.co/auth/v1/callback
```

### 4. Database

```bash
cd backend
bunx prisma generate
bunx prisma db push
```

### 5. Run the three processes

```bash
# terminal 1
cd backend && bun run start

# terminal 2
cd backend && bun run worker

# terminal 3
cd frontend && bun run dev
```

Then open [http://localhost:3000](http://localhost:3000).

- Sign in with Google/GitHub, or
- Click **Skip login** / open [http://localhost:3000/local](http://localhost:3000/local) to test without OAuth

## Keeping Supabase awake

Free-tier Supabase pauses after about 7 days of inactivity. A cheap `SELECT 1` is not enough.

DeepQuery follows [supabase-pause-prevention](https://github.com/travisvn/supabase-pause-prevention):

- `/health` and `/keep-alive` insert or delete a row in a `keep_alive` table
- They also ping the Supabase Auth API
- `.github/workflows/keep-alive.yml` hits the live `/health` URL every 10 minutes

After deploy, run `bunx prisma db push` on the hosted database so the `keep_alive` table exists.

## Project layout

```txt
frontend/     React app (Bun)
backend/      Express API + BullMQ worker
prisma/       schema + migrations (under backend/)
docker-compose.yml
```

## License

MIT. See [LICENSE](LICENSE).
