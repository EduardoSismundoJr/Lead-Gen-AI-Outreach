# 🚀 Lead Generation + AI Outreach Pipeline

> Automated lead generation and personalized cold outreach powered by Claude AI, Google Sheets, Gmail, and n8n workflow automation.

## Overview

This is a **production-ready automation pipeline** that takes a lead from a Google Sheet, uses Claude AI to write a personalized outreach email, sends it via Gmail, and logs the result — all without manual intervention.

```
Lead Added → n8n Detects → Claude AI Writes Email → Gmail Sends → Sheet Updated
```

### 🎯 Use Cases
- **Outbound Sales** — Automate personalized cold emails at scale
- **Recruiting** — Reach out to candidates with tailored messages
- **Business Development** — Prospect and engage potential partners
- **Freelancing** — Automated client prospecting pipeline

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌───────────────────┐
│  Dashboard (UI) │────▶│  Vercel API  │────▶│  Google Sheets    │
│  Add/View Leads │     │  (Node.js)   │     │  (Lead Database)  │
└─────────────────┘     └──────┬───────┘     └────────┬──────────┘
                               │                      │
                        ┌──────▼───────┐     ┌────────▼──────────┐
                        │  Claude API  │     │  n8n (Automation) │
                        │  (AI Writer) │     │  Poll & Trigger   │
                        └──────┬───────┘     └───────────────────┘
                               │
                        ┌──────▼───────┐
                        │  Gmail API   │
                        │  (Send Mail) │
                        └──────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js (Vercel Serverless Functions) |
| AI | Claude API (Anthropic SDK) |
| Email | Gmail API (OAuth2) |
| Database | Google Sheets API |
| Automation | n8n (self-hosted) |
| Hosting | Vercel |

## Features

- ✅ **AI-Powered Emails** — Claude writes personalized, non-spammy outreach based on lead context
- ✅ **One-Click Dashboard** — Add leads, view status, retry failed sends
- ✅ **Auto-Detection** — n8n polls for new leads and triggers the pipeline
- ✅ **Full Audit Trail** — Every email, status change, and AI reasoning logged to Sheets
- ✅ **Retry Logic** — Automatic and manual retry for failed sends
- ✅ **Smart Headers** — Auto-formats Google Sheet with professional styling
- ✅ **Error Handling** — Exponential backoff on Claude API, graceful Gmail error recovery

## Project Structure

```
├── api/
│   ├── add-lead.js          # POST /api/add-lead — Add lead from dashboard
│   ├── get-leads.js         # GET  /api/get-leads — Fetch all leads
│   ├── process-lead.js      # POST /api/process-lead — Full pipeline (AI → Email → Log)
│   └── retry-lead.js        # POST /api/retry-lead — Retry a failed lead
├── lib/
│   ├── claude.js            # Claude API wrapper with retry logic
│   ├── gmail.js             # Gmail OAuth2 + MIME message builder
│   ├── prompts.js           # AI prompt templates
│   ├── sheets.js            # Google Sheets CRUD + auto-formatting
│   └── validation.js        # Input validation & sanitization
├── public/
│   ├── index.html           # Dashboard UI
│   ├── styles.css           # Dashboard styling
│   └── app.js               # Dashboard logic (fetch, submit, retry)
├── n8n/
│   ├── lead-intake.json     # n8n workflow: poll for new leads
│   └── retry-failed.json    # n8n workflow: auto-retry failed leads
├── scripts/
│   └── gmail-auth.js        # Helper to obtain Gmail OAuth refresh token
├── vercel.json              # Vercel routing configuration
└── package.json
```

## Quick Start

### Prerequisites
- Node.js 18+
- Google Cloud project with Sheets API & Gmail API enabled
- Anthropic API key
- n8n (local or cloud)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/lead-generation-automation.git
cd lead-generation-automation
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in your credentials:

```env
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=your-service-account.json
GOOGLE_SHEET_ID=your-sheet-id
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
GMAIL_FROM_EMAIL=you@gmail.com
```

### 3. Set Up Google Sheets

1. Create a new Google Sheet
2. Share it with your service account email (e.g., `lead-gen@project.iam.gserviceaccount.com`)
3. Copy the Sheet ID from the URL
4. The system auto-creates headers and formats the sheet on first run

### 4. Get Gmail Refresh Token

```bash
node scripts/gmail-auth.js
```

Follow the OAuth flow and paste the resulting refresh token into `.env.local`.

### 5. Deploy

```bash
# Deploy to Vercel
npx vercel --prod

# Or run locally
npx vercel dev
```

### 6. Import n8n Workflows

1. Open n8n at `http://localhost:5678`
2. Import `n8n/lead-intake.json` and `n8n/retry-failed.json`
3. Update the API URL in the HTTP Request nodes to your Vercel deployment URL
4. Activate both workflows

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/get-leads` | GET | Fetch all leads from the sheet |
| `/api/add-lead` | POST | Add a new lead `{name, email, company, role, linkedin}` |
| `/api/process-lead` | POST | Process a lead through the full pipeline `{row}` |
| `/api/retry-lead` | POST | Retry a failed lead `{row}` |

## Google Sheet Schema

| Column | Field | Description |
|--------|-------|-------------|
| A | Name | Lead's full name |
| B | Email | Lead's email address |
| C | Company | Lead's company |
| D | Role | Job title |
| E | LinkedIn | Profile URL |
| F | Status | `new` / `sent` / `failed` |
| G | Email Sent | Timestamp of sent email |
| H | Notes | AI reasoning / error messages |

## License

MIT

---

Built with ❤️ using Claude AI, Google APIs, and n8n
