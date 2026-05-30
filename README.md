# LLM Interface

**One chat. Every model. Your keys.**

Most people are locked into a single AI provider's app. LLM Interface is a unified chat where you bring your own API keys — OpenAI, Anthropic, Google Gemini, xAI Grok — and talk to all of them through one interface. It always picks the best available model and, when a provider goes down, automatically fails over to the next one without losing your conversation.

The hard part it solves: **context portability.** When the active model changes mid-conversation, your history is reformatted for the new provider, and intelligently compressed if it overflows that model's context window — so the conversation stays coherent no matter who's answering.

## Features

- 🔌 **Bring your own keys** — OpenAI, Anthropic, Gemini, and Grok, encrypted at rest (AES-256-GCM)
- 🔀 **Automatic failover** — providers are tried in your priority order; a 429 or outage falls through to the next
- 🧠 **Context compression** — rolling summaries kick in when a conversation outgrows the model's window
- 🏷️ **Model transparency** — every reply shows which model produced it
- 🔐 **Auth + per-user storage** — email/password login via Supabase, with row-level security

## Tech Stack

- **Next.js 16** (App Router) — UI and API routes in one repo
- **Supabase** — authentication + Postgres
- **Vercel** — hosting

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd llm-interface
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. In the dashboard, open the **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it
3. Grab your keys from **Settings → API**

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → default/anon key |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → secret/service_role key |
| `ENCRYPTION_SECRET` | Run `openssl rand -hex 32` and paste the output |

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, confirm your email, then add at least one provider key in **Settings** and start chatting.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import it at [vercel.com](https://vercel.com) → **Add New → Project**
3. Add the same four environment variables under **Settings → Environment Variables**
4. Deploy
5. In Supabase → **Authentication → URL Configuration**, set your Vercel URL as the **Site URL**

## How It Works

```
You send a message
      │
      ▼
┌─────────────────┐
│  Router         │  Picks highest-priority available provider
│  (lib/router)   │  Circuit-breaks failing providers for 60s
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Compressor     │  If history > 80% of context window,
│  (lib/context)  │  summarizes the oldest turns into a summary node
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Provider       │  Normalized messages → provider's native format
│  adapter        │  Streams the response back (SSE)
└─────────────────┘
      │
      ▼  On error: fail over to next provider, same context
```

## Roadmap

- Hierarchical (RAPTOR-lite) tree compression — multi-level summaries, no raw turns ever dropped
- Coding / agent interface beyond chat
- Model quality scoring and custom ranking
- Usage and cost analytics
