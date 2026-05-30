# LLM Interface

**One chat. Every model. Your keys.**

Most people are locked into a single AI provider's app. LLM Interface is a unified chat where you bring your own API keys — OpenAI, Anthropic, Google Gemini, xAI Grok, plus the free-tier speed demons Groq and Cerebras — and talk to all of them through one interface. It always picks the best available model and, when a provider goes down, automatically fails over to the next one without losing your conversation.

The hard part it solves: **context portability.** When the active model changes mid-conversation, your history is reformatted for the new provider, and intelligently compressed if it overflows that model's context window — so the conversation stays coherent no matter who's answering.

## Why LLM Interface

- **Never get rate-limited again.** Hit OpenAI's 429? Your message silently re-routes to Claude, Gemini, or a free provider — same conversation, no copy-paste, no restart.
- **One conversation, many brains.** Start a thread on Gemini, hand it to GPT-4o for reasoning, finish on a free model — the full history travels with you, reshaped for whoever's answering.
- **Your keys, your data, no middleman markup.** Unlike proxy services, calls go straight from your server to each provider with your own keys. Nothing is resold, and keys are encrypted at rest (AES-256-GCM).
- **Free to run, free to chat.** Add a Groq or Cerebras key and you have a genuinely free, blazing-fast assistant — no credit card, no provider lock-in.

## Features

- 🔌 **Six providers, your keys** — OpenAI, Anthropic, Gemini, Grok, Groq, and Cerebras, encrypted at rest (AES-256-GCM)
- 🆓 **Free options built in** — Groq and Cerebras run on free tiers with sub-second responses
- 🔀 **Transparent failover** — providers are tried in your priority order; a 429 or outage rotates to the next, with a quiet "falling back to…" note
- 🧠 **Context portability + compression** — history is reformatted per provider, and rolling summaries kick in when a conversation outgrows the model's window
- 🎯 **Pick a model or let it choose** — pin a specific provider per chat, or leave it on Auto for availability-first routing
- ✍️ **Rich markdown chat** — code blocks, tables, and lists render properly, streamed token-by-token
- 🏷️ **Model transparency** — every reply shows which model actually produced it
- 🔐 **Auth + per-user storage** — email/password or Google sign-in via Supabase, with row-level security

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
