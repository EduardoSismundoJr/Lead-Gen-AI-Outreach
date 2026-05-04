---
name: Lead Pipeline Project Overview
description: Core facts about the Lead Generation + Outreach Pipeline project — stack, working directory, conventions
type: project
---

This is a Lead Generation + Outreach Pipeline built in Node.js, deployed to Vercel.

**Stack:**
- Runtime: Node.js (>=18)
- Claude API: @anthropic-ai/sdk
- Google Sheets + Gmail: googleapis (OAuth2)
- Email fallback: nodemailer
- Local dev server: express
- Env vars: dotenv
- Automation: n8n (local)
- Frontend: vanilla HTML/CSS/JS
- Deployment: Vercel

**Working directory:** `C:\Users\Eduardo\Downloads\Lead-Generation Automation`

**Key conventions:**
- JavaScript only (not TypeScript)
- Never hardcode API keys — always use process.env
- .env.local for environment variables
- Entry point: server.js

**Phase progress:**
- Phase 1 (T1.1–T1.5): Complete — scaffolding, package.json, .env.local template, vercel.json, server.js
- Phase 2 (T2.1–T2.5): Complete — lib/sheets.js with getSheets, getNewLeads, updateLeadStatus, appendLead, getAllLeads

**Why:** 8-phase build plan executed task-by-task with acceptance criteria verification before advancing.

**How to apply:** Always write JS, never TS. Always check for file existence before creating. Stop after each task and report results.
