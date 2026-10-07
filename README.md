# OpsPilot

OpsPilot is an AI operations assistant for your company. Admins upload internal PDFs (policies, SOPs, handbooks). Employees then ask questions in a chat, and OpsPilot answers **only from those documents** and shows which document each answer came from.

```
┌──────────────────────┐   Bearer token    ┌──────────────────────────┐
│  ui/  (Next.js 16)   │ ────────────────▶ │  server/  (FastAPI)      │
│  chat + admin        │ ◀──── SSE stream  │  RAG + conversations     │
└─────────┬────────────┘                   └──────┬─────────┬─────────┘
          │ sign in / sign up                     │         │
          ▼                                       ▼         ▼
   ┌──────────────────────────────────────────────────┐  ┌──────────┐
   │ Supabase: Auth · Postgres + pgvector · Storage   │  │ Groq LLM │
   └──────────────────────────────────────────────────┘  └──────────┘
```

## Repository layout

| Folder | What it is | Docs |
| --- | --- | --- |
| [`server/`](server/) | Python 3.13 FastAPI API: PDF ingestion, embeddings, vector search, grounded answers that stream to the UI, and per-user chat history | [server/README.md](server/README.md) |
| [`ui/`](ui/) | Next.js 16 / React 19 web app: Supabase sign-in, chat with saved conversations, and an admin console for the knowledge base | [ui/README.md](ui/README.md) |

## Features

- **Answers grounded in your documents.** Questions are embedded, matched against document chunks with pgvector, and answered by an LLM that may only use the context it was given. If nothing relevant is found, it says so.
- **Streaming chat with sources.** Answers stream in using the Vercel AI SDK UI message protocol, and each answer lists the documents it used.
- **Saved conversations.** Each user has their own history and can rename, delete, regenerate, or stop an answer. A stopped answer is saved as far as it got.
- **Admin knowledge base.** Admins upload PDFs (up to 20 MB) and delete them. The admin UI and API return 404 to everyone else.
- **Supabase auth.** Email and password sign-up with a confirmation link. Roles are stored in `app_metadata`, which users can't change themselves.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui (Base UI), Vercel AI SDK, Streamdown |
| Backend | FastAPI, SQLAlchemy 2 (async) + psycopg 3, LangChain, `uv` |
| AI | Groq `openai/gpt-oss-120b` for answers, `all-MiniLM-L6-v2` (384-dim, runs locally) for embeddings |
| Platform | Supabase Auth, Postgres + `pgvector`, Supabase Storage |

## Quick start

You need **Python 3.13 + [uv](https://docs.astral.sh/uv/)**, **Node.js 20+**, a **[Supabase](https://supabase.com) project**, and a **[Groq](https://console.groq.com) API key**.

1. **Set up Supabase.** Turn on `pgvector`, create the tables and a storage bucket, and set the auth redirect URL. The steps are in [server/README.md → Supabase setup](server/README.md#supabase-setup).
2. **Start the API** (runs on <http://localhost:8000>):
   ```bash
   cd server
   cp .env.example .env        # fill in the values
   uv sync
   uv run python -m server.scripts.apply_sql sql/conversations.sql
   uv run fastapi dev src/server/main.py
   ```
3. **Start the web app** (runs on <http://localhost:3000>):
   ```bash
   cd ui
   cp .env.example .env.local  # fill in the values
   npm install
   npm run dev
   ```
4. **Sign up** in the app, confirm your email, then make yourself an admin:
   ```bash
   cd server
   uv run python -m server.scripts.set_role you@example.com admin
   ```
   Sign out and back in. You'll see the admin console at `/admin`, where you can upload your first PDFs.

## How a question is answered

1. The UI sends the conversation to `POST /api/v1/chat` along with the user's Supabase access token.
2. The server checks the token with Supabase and saves the user's message.
3. The question is embedded, and the top `k` chunks above the similarity threshold are retrieved from `document_chunks`. The defaults are 5 chunks and a threshold of 0.3.
4. Groq gets a system prompt, the retrieved chunks, and the last 10 messages, then streams an answer back as server-sent events (SSE).
5. Once the stream ends, the full answer and its sources are saved, including when the user stopped it early.
