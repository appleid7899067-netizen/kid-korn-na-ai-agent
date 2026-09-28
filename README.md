<a href="https://chatbot.ai-sdk.dev/demo">
  <img alt="AI Builder" src="app/(chat)/opengraph-image.png">
  <h1 align="center">AI Builder</h1>
</a>

<p align="center">
    AI Builder is a focused workspace for turning ideas into polished, editable web experiences with AI-assisted generation, live preview, and production-ready code.
</p>

<p align="center">
  <a href="https://chatbot.ai-sdk.dev/docs"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## AI Builder workspace

The main workspace turns the starter chatbot shell into an AI Builder canvas. Describe a change in natural language, switch between a live preview and generated code, compare desktop/tablet/mobile breakpoints, choose a starter template, and tune the site title, primary color, typeface, and corner style from the inspector.

The current builder ships with three ready-to-edit starting points: Launchpad for SaaS pages, Atelier for creative portfolios, and Goodfolk for boutique storefronts. The prompt composer provides a lightweight generation loop with visible build status, change count, code copy, and `.tsx` download actions. It is intentionally dependency-free and uses the existing Next.js, Tailwind CSS, and Lucide setup.

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports OpenAI, Anthropic, Google, xAI, and other model providers via AI Gateway
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template uses the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) to access multiple AI models through a unified interface. Models are configured in `lib/ai/models.ts` with per-model provider routing. Included models: Mistral, Moonshot, DeepSeek, OpenAI, and xAI.

### AI Gateway Authentication

**For Vercel deployments**: Authentication is handled automatically via OIDC tokens.

**For non-Vercel deployments**: You need to provide an AI Gateway API key by setting the `AI_GATEWAY_API_KEY` environment variable in your `.env.local` file.

With the [AI SDK](https://ai-sdk.dev/docs/introduction), you can also switch to direct LLM providers like [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://ai-sdk.dev/providers/ai-sdk-providers) with just a few lines of code.

## Puter — ล็อกอินและโมเดล AI ในที่เดียว (แนะนำ)

[Puter](https://puter.com) ให้ทั้ง **ระบบล็อกอิน** และ **โมเดล AI กว่า 500 ตัว** (GPT, Claude, Gemini, Grok ฯลฯ) ผ่าน OpenAI-compatible endpoint เดียว — ไม่ต้องสมัคร API key หลายเจ้า โดยผู้ใช้แต่ละคนจะออกค่า AI ของตัวเองตาม [User-Pays model](https://docs.puter.com/user-pays-model/)

ตั้งค่า 2 ขั้นตอน:

1. **โมเดล (ฝั่งเซิร์ฟเวอร์)** — สร้าง API token ที่ [puter.com/dashboard](https://puter.com/dashboard) (ปุ่ม "Create token") แล้วตั้ง environment variable:
   ```env
   PUTER_AUTH_TOKEN=your-puter-token
   ```
   เมื่อตั้งค่านี้ รายการโมเดลจะสลับเป็นโมเดลของ Puter (`puter/gpt-5.4-nano`, `puter/gpt-4o`, `puter/claude-sonnet-5` ฯลฯ) โดยอัตโนมัติ และผู้ใช้ที่ล็อกอินด้วย Puter จะใช้ token ของตัวเองก่อน (ระบบจะใช้ `PUTER_AUTH_TOKEN` เป็นค่าสำรองสำหรับ guest)
2. **ล็อกอิน (ฝั่ง browser)** — ปุ่ม **"Continue with Puter"** บนหน้า `/login` เปิด Puter sign-in popup ระบบจะตรวจสอบ token กับ `api.puter.com/whoami` ก่อนสร้าง session (บันทึก Puter token ไว้ในฐานข้อมูลเพื่อใช้เรียกโมเดลในชื่อผู้ใช้นั้น ๆ)

ปรับแต่งรายการโมเดลได้ด้วย `AI_MODELS_JSON` (รูปแบบ `puter/ชื่อโมเดล`) และ `AI_TITLE_MODEL` — ดูรายชื่อโมเดลทั้งหมดที่ [developer.puter.com/ai/models](https://developer.puter.com/ai/models/)

With [Puter](https://puter.com) you get **sign-in** and **500+ AI models** (GPT, Claude, Gemini, Grok, ...) through a single OpenAI-compatible endpoint. Set `PUTER_AUTH_TOKEN` (from [puter.com/dashboard](https://puter.com/dashboard)) and the model catalog switches to Puter models automatically. The **"Continue with Puter"** button on `/login` signs users in via the Puter popup; each signed-in user's own token is used for AI calls first (Puter's User-Pays model), with `PUTER_AUTH_TOKEN` as the fallback.

## Deploy Your Own

### Render (แนะนำ)

โปรเจกต์มี [render.yaml](render.yaml) พร้อมใช้งาน — Render จะสร้าง Postgres database + web service ให้อัตโนมัติ และรัน migrations ตอน build:

1. Push repo ขึ้น GitHub แล้วเปิด [Render Dashboard](https://dashboard.render.com) → **New +** → **Blueprint** → เลือก repo นี้ (ระบบจะอ่าน `render.yaml` ให้เอง)
2. ตั้งค่า `PUTER_AUTH_TOKEN` ในหน้า environment ของ service (ค่าอื่นอย่าง `AUTH_SECRET` และ `POSTGRES_URL` Render ตั้งให้อัตโนมัติ)
3. กด **Apply** — เสร็จแล้วจะได้ URL แบบ `https://kid-korn-ai-agent.onrender.com` (health check ที่ `/ping`)

> หมายเหตุ: แผนฟรีของ Render จะ sleep เมื่อไม่มีคนเข้าใช้ (ตื่นเองเมื่อมี request) และ Postgres ฟรีมีอายุทดลอง 90 วัน — สำหรับงานจริงแนะนำแผน Starter

### Vercel

You can deploy your own version of Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/templates/next.js/chatbot)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run AI Builder. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm db:migrate # Setup database or apply latest database changes
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).

## Bring your own key และผู้ให้บริการหลายราย

ระบบรองรับผู้ให้บริการที่ใช้ **OpenAI-compatible Chat Completions API** โดยคีย์ทั้งหมดถูกอ่านเฉพาะฝั่งเซิร์ฟเวอร์และไม่ถูกส่งไปยัง browser ผู้ใช้สามารถใช้ `OPENAI_API_KEY` ร่วมกับ `OPENAI_BASE_URL` สำหรับ endpoint เดียว หรือกำหนดหลายรายผ่าน `AI_PROVIDER_CONFIG_JSON` ได้ เช่น `groq`, `openrouter` หรือ gateway ภายในองค์กร

โมเดลแต่ละรายการใช้รูปแบบ `provider/model-name` เช่น `openai/gpt-4o-mini` หรือ `groq/llama-3.3-70b-versatile` รายการโมเดลที่ปรากฏในตัวเลือกจะอ่านจาก `AI_MODELS_JSON` และโมเดลรายการแรกจะเป็นค่าเริ่มต้น ส่วน `AI_TITLE_MODEL` ใช้กำหนดโมเดลสำหรับตั้งชื่อแชตอัตโนมัติ

> ห้ามใส่ API key ในโค้ดฝั่ง client, ค่า `NEXT_PUBLIC_*`, git หรือไฟล์ที่อัปโหลดสู่ repository ให้เก็บ secrets ใน environment variables ของ deployment เท่านั้น

```env
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1
AI_PROVIDER_CONFIG_JSON={"groq":{"apiKey":"gsk-your-key","baseURL":"https://api.groq.com/openai/v1"}}
AI_MODELS_JSON=[{"id":"openai/gpt-4o-mini","name":"GPT-4o mini","provider":"openai","description":"Fast general-purpose model"},{"id":"groq/llama-3.3-70b-versatile","name":"Llama 3.3 70B","provider":"groq","description":"Fast open model"}]
```

ความสามารถเด่นของเวอร์ชันนี้คือ **Bring-your-own-key แบบไม่ผูก vendor**, **model catalog ที่ปรับเปลี่ยนได้โดยไม่แก้ UI**, และ **provider-aware routing** ซึ่งช่วยให้ทีมสลับ endpoint หรือเพิ่มผู้ให้บริการใหม่ได้โดยแก้เฉพาะ environment configuration
