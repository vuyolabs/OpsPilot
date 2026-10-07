-- Per-user chat history.
-- Apply with: uv run python -m server.scripts.apply_sql sql/conversations.sql

create table if not exists public.conversations (
    id uuid primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    title text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
    on public.conversations (user_id, updated_at desc);

create table if not exists public.chat_messages (
    -- AI SDK message ids (e.g. "msg_..."), so the UI can match them up.
    id text primary key,
    conversation_id uuid not null references public.conversations (id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    sources jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_created_idx
    on public.chat_messages (conversation_id, created_at);

-- The backend connects as the table owner and bypasses RLS. Enabling RLS
-- with no policies blocks the public Supabase API (anon/authenticated
-- roles) from reading anyone's conversations.
alter table public.conversations enable row level security;
alter table public.chat_messages enable row level security;
