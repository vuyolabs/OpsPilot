# OpsPilot API (`server/`)

The FastAPI backend for OpsPilot. It turns uploaded PDFs into a searchable knowledge base, answers questions grounded in that knowledge base, streams the answers to the UI, and stores each user's conversations.

## Requirements

- Python **3.13** (pinned in `.python-version`)
- [uv](https://docs.astral.sh/uv/) package manager
- A Supabase project (Postgres with `pgvector`, Auth, Storage)
- A [Groq](https://console.groq.com) API key

The embedding model (`sentence-transformers/all-MiniLM-L6-v2`, about 90 MB) downloads from Hugging Face the first time the server starts. After that it loads from the local cache.

## Setup

```bash
cd server
uv sync                  # creates .venv and installs from uv.lock
cp .env.example .env     # then fill in the values below
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GROQ_API_KEY` | yes | Groq API key used for answer generation |
| `DATABASE_URL` | yes | Postgres connection string for the **async psycopg** driver, e.g. `postgresql+psycopg://postgres:<password>@<host>:5432/postgres` |
| `SUPABASE_URL` | yes | `https://<project-ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | yes | Supabase **secret** key (Project Settings → API Keys). It is used to verify user tokens, manage roles, and access Storage, so never expose it to the browser. |
| `SUPABASE_STORAGE_BUCKET` | no | Bucket for the original PDFs. Defaults to `knowledge-documents`. |
| `CORS_ORIGINS` | no | JSON list of allowed origins. Defaults to `["http://localhost:3000"]`. |

## Supabase setup

1. **Database tables.** Conversation tables ship with the repo:

   ```bash
   uv run python -m server.scripts.apply_sql sql/conversations.sql
   ```

   The knowledge-base tables (`documents`, `document_chunks`) are mapped in `src/server/models/document.py`, but the repo has no SQL file for them yet. Run this once in the Supabase SQL editor. It matches the models:

   ```sql
   create extension if not exists vector;

   create table if not exists public.documents (
       id uuid primary key default gen_random_uuid(),
       filename text not null,
       file_type text,
       source text,
       storage_path text,
       metadata jsonb not null default '{}'::jsonb,
       created_at timestamptz not null default now()
   );

   create table if not exists public.document_chunks (
       id uuid primary key default gen_random_uuid(),
       document_id uuid not null references public.documents (id) on delete cascade,
       content text not null,
       chunk_index integer not null,
       embedding vector(384) not null,
       metadata jsonb not null default '{}'::jsonb,
       created_at timestamptz not null default now()
   );

   create index if not exists document_chunks_embedding_idx
       on public.document_chunks using hnsw (embedding vector_cosine_ops);

   alter table public.documents enable row level security;
   alter table public.document_chunks enable row level security;
   ```

   The backend connects as the table owner, so RLS without policies doesn't affect it. RLS only blocks the public Supabase API from reading these tables.

2. **Storage.** Create a **private** bucket named `knowledge-documents`, or whatever you set in `SUPABASE_STORAGE_BUCKET`.

3. **Auth.** Keep Email sign-in enabled. Under Authentication → URL Configuration, add `http://localhost:3000/auth/confirm` (plus your production URL) to the redirect URLs so confirmation links reach the UI.

## Running

```bash
uv run fastapi dev src/server/main.py      # dev server with reload on :8000
uv run fastapi run src/server/main.py      # production mode
```

- Health check: `GET /` → `{"message": "OpsPilot API is running"}`
- Interactive docs: <http://localhost:8000/docs>. Admin routes are hidden from these docs on purpose.

## Admin roles

Roles are stored in each Supabase user's `app_metadata.role`. Only the secret key can change `app_metadata`, so users can't promote themselves. The user has to sign up in the UI before you can change their role:

```bash
uv run python -m server.scripts.set_role someone@example.com admin
uv run python -m server.scripts.set_role someone@example.com user
```

The new role takes effect after the user signs in again or their token refreshes.

## API

Every endpoint requires `Authorization: Bearer <supabase access token>`.

### Chat: `/api/v1/chat`

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/chat` | Takes an AI SDK `useChat` request (`id`, `messages`, `trigger`, optional `top_k` 1–10 and `similarity_threshold` 0–1). Returns an SSE stream in the [AI SDK UI message stream protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol). The chat `id` is used as the conversation id, and the conversation is created on the first message. |

### Conversations: `/api/v1/conversations`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/conversations` | The current user's 100 most recently updated conversations |
| `GET` | `/api/v1/conversations/{id}` | One conversation, with its messages shaped as AI SDK `UIMessage`s |
| `PATCH` | `/api/v1/conversations/{id}` | Rename: `{ "title": "..." }` |
| `DELETE` | `/api/v1/conversations/{id}` | Delete a conversation and its messages |

Someone else's conversation returns `404`, the same as one that doesn't exist.

### Knowledge base: `/api/v1/knowledge`

These are non-streaming endpoints, handy for testing retrieval directly.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/knowledge/search` | `{ query, top_k?, similarity_threshold? }` → matching chunks with similarity scores |
| `POST` | `/api/v1/knowledge/ask` | Same body → `{ answer, sources }` |

### Admin: `/api/v1/admin`

Every admin route returns `404` to anyone who isn't an admin.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/admin/documents` | List documents with chunk counts, sizes, and uploaders |
| `POST` | `/api/v1/admin/documents` | Multipart `file` upload. PDF only, up to 20 MB. Runs the ingestion pipeline. |
| `DELETE` | `/api/v1/admin/documents/{id}` | Delete a document, its chunks, and the stored PDF |

## How the RAG pipeline works

**Ingestion** (`rag/ingestion.py`):
1. `pypdf` extracts the text, page by page.
2. `RecursiveCharacterTextSplitter` splits it into 1000-character chunks that overlap by 150 characters.
3. Each chunk is embedded with `all-MiniLM-L6-v2` into a normalized 384-dimension vector.
4. The original PDF is uploaded to Supabase Storage at `documents/<id>/<filename>`.
5. The chunks and vectors are written to `document_chunks`. If that write fails, the uploaded PDF is deleted again.

Blocking work (PDF parsing, embedding, storage calls) runs in worker threads so the event loop stays free.

**Retrieval** (`rag/retrieval.py`): finds chunks by cosine similarity with pgvector, keeping only those at or above `similarity_threshold` and returning at most `top_k`.

**Generation** (`rag/generation.py`): Groq `openai/gpt-oss-120b` runs at temperature 0. Its system prompt tells it to answer only from the retrieved context and to say when the answer isn't there. The model also gets the last 10 messages as history.

## Project structure

```
server/
├── sql/conversations.sql       # conversations + chat_messages tables
├── src/server/
│   ├── main.py                 # FastAPI app, CORS, routers
│   ├── ai/llm.py               # Groq chat model
│   ├── api/
│   │   ├── routes/             # admin, chat, conversations, knowledge
│   │   └── schemas/            # Pydantic request models
│   ├── core/
│   │   ├── auth.py             # Supabase token check, require_admin
│   │   ├── config.py           # settings from .env
│   │   └── database.py         # async engine + session
│   ├── models/                 # SQLAlchemy models
│   ├── rag/                    # loader, splitter, embeddings, ingestion, retrieval, generation
│   ├── services/conversations.py
│   ├── storage/                # Supabase client + Storage wrapper
│   └── scripts/                # apply_sql, set_role
├── pyproject.toml / uv.lock
└── requirements.txt            # unpinned list for pip users
```

## Using pip instead of uv

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -e .
fastapi dev src/server/main.py
```
