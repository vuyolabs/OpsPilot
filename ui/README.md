# OpsPilot Web (`ui/`)

The OpsPilot web app, built with Next.js 16 (App Router) and React 19. It has Supabase sign-in, a streaming chat with saved conversations, and an admin console for managing the knowledge base. All data comes from the [FastAPI server](../server/README.md).

## Requirements

- Node.js **20+** and npm
- The OpsPilot API running (default `http://localhost:8000`)
- The same Supabase project the API uses

## Setup

```bash
cd ui
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the FastAPI server. Defaults to `http://localhost:8000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase **publishable** key (Project Settings → API Keys). It's safe to expose in the browser. |

The app's origin must be listed in the API's `CORS_ORIGINS`. Its `/auth/confirm` URL must also be in Supabase's allowed redirect URLs. See [server setup](../server/README.md#supabase-setup).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Routes

| Route | Description |
| --- | --- |
| `/login` | Sign in or sign up with email and password. Supports `?next=` to return to the page you came from. |
| `/auth/confirm` | Where the Supabase email confirmation link lands. Covers expired links, links opened twice, and links opened in a different browser. |
| `/` | New chat |
| `/c/[id]` | An existing conversation |
| `/admin` | Knowledge base console: upload and delete PDFs. Shows a 404 to anyone who isn't an admin. |

## How it works

- **Sessions.** `src/proxy.ts` (Next 16's replacement for `middleware.ts`) refreshes the Supabase session cookie on every request and sends signed-out visitors to `/login`.
- **Authorization.** Server components call `getCurrentUser()` (`src/lib/auth.ts`), which verifies the user with Supabase. A user is an admin when `app_metadata.role === "admin"`. Admins are set from the backend with `server.scripts.set_role`.
- **Calling the API.** Every request sends the Supabase access token as `Authorization: Bearer …`. Server components get it from cookies, and client components get it with `getBrowserAccessToken()`.
- **Chat.** The chat uses `useChat` from `@ai-sdk/react` with a `DefaultChatTransport` pointed at `POST {API_URL}/api/v1/chat`. The backend streams the AI SDK UI message protocol, so text and sources appear as they arrive. Markdown is rendered with Streamdown.
- **Conversation list.** The sidebar list is loaded on the server in `(chat)/layout.tsx` and kept up to date on the client by `ConversationsProvider`.

## Project structure

```
ui/src/
├── app/
│   ├── (chat)/              # chat layout, new chat page, /c/[id]
│   ├── admin/               # admin console (admins only)
│   ├── auth/confirm/        # email confirmation route handler
│   ├── login/
│   ├── layout.tsx           # fonts, theme, toaster, tooltips
│   └── globals.css          # Tailwind v4 + theme tokens
├── components/
│   ├── admin/               # upload card, documents table
│   ├── auth/                # auth form, user menu
│   ├── chat/                # chat, sidebar, conversations provider
│   ├── brand/               # logo
│   └── ui/                  # shadcn/ui components (Base UI)
├── hooks/
├── lib/
│   ├── api.ts               # API_URL, error helpers
│   ├── admin-api.ts         # admin document requests
│   ├── conversations.ts     # conversation requests
│   ├── auth.ts              # getCurrentUser, getAccessToken
│   ├── access-token.ts      # token for client components
│   └── supabase/            # browser, server, and proxy clients
└── proxy.ts                 # session refresh + auth redirect
```

## Notes for contributors

- This project uses **Next.js 16**, which changes some APIs (for example `proxy.ts` and typed `LayoutProps`). See `AGENTS.md`, and check the docs in `node_modules/next/dist/docs/` before relying on older Next.js patterns.
- UI components come from shadcn/ui with the `base-lyra` style (`components.json`). Add new ones with `npx shadcn add <component>`.
- Icons come from Hugeicons (`@hugeicons/react`).
