# Ledger — Personal Finance Tracker

Multi-bank spend tracking with AI categorisation, group expenses, budgets, and financial forecasting. Built with Next.js 14, Supabase, and Claude AI.

---

## Features

- **CSV upload** — import from Revolut, Wise, Lloyds, ASB, Monzo
- **AI categorisation** — Claude auto-categorises transactions; low-confidence ones flagged for review
- **FX conversion** — live rates from Frankfurter API; pick your base currency
- **Month-on-month dashboard** — spend trends, income vs spend charts
- **Budget tracking** — set per-category budgets, see overspend at a glance
- **Group expenses** — track shared dinners/costs, link reimbursements
- **Financial insights** — 12-month forecasting, personalised savings opportunities
- **Multi-user** — each user has their own account via Supabase Auth

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Auth + DB | Supabase (Postgres + Row Level Security) |
| AI | Claude claude-sonnet-4-20250514 via Anthropic SDK |
| FX rates | Frankfurter API (free, no key needed) |
| Charts | Recharts |
| Deploy | Vercel |

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/your-username/ledger.git
cd ledger
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the SQL editor: **Dashboard → SQL Editor**
3. Paste and run the contents of `supabase/schema.sql`
4. Copy your project URL and anon key from **Settings → API**

### 3. Set environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Get your Anthropic API key at [console.anthropic.com](https://console.anthropic.com/settings/keys).

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo at [vercel.com](https://vercel.com) for automatic deploys.

Add the same environment variables in **Vercel → Project → Settings → Environment Variables**.

Update `NEXT_PUBLIC_SITE_URL` to your Vercel URL (e.g. `https://ledger.vercel.app`).

### Supabase auth redirect URL

In Supabase: **Authentication → URL Configuration → Redirect URLs** — add your Vercel URL:
```
https://your-app.vercel.app/auth/callback
```

---

## Adding your bank's CSV

Parsers are in `lib/parsers/index.ts`. Each parser receives raw CSV rows and returns normalised transactions.

To add a new bank:

1. Export a sample CSV from the bank
2. Check the column headers (date, description, debit, credit)
3. Add a parser function in `lib/parsers/index.ts`
4. Add the bank to `BANKS` in `lib/categories.ts`

---

## Project structure

```
ledger/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx         # Login page
│   │   ├── signup/page.tsx        # Signup page
│   │   └── callback/route.ts      # Email confirm handler
│   ├── api/
│   │   ├── categorise/route.ts    # POST — AI categorisation (server-side)
│   │   ├── transactions/route.ts  # GET/POST/PATCH/DELETE
│   │   ├── budgets/route.ts       # GET/PUT
│   │   ├── groups/route.ts        # GET/POST/DELETE
│   │   └── fx/route.ts            # GET — proxies Frankfurter
│   ├── dashboard/
│   │   ├── page.tsx               # Dashboard overview (server)
│   │   ├── DashboardClient.tsx    # Charts and stats (client)
│   │   ├── transactions/page.tsx  # Transaction table + inline edit
│   │   ├── upload/page.tsx        # CSV upload + AI categorise
│   │   ├── budgets/page.tsx       # Budget tracking
│   │   ├── groups/page.tsx        # Group expenses
│   │   └── insights/page.tsx      # Forecasting + insights
│   ├── globals.css                # Design tokens + base styles
│   └── layout.tsx
├── components/
│   ├── Sidebar.tsx                # Navigation
│   ├── MonthPicker.tsx            # Month filter pill bar
│   ├── CategoryBadge.tsx          # Coloured category pill
│   └── ConfidenceBar.tsx          # AI confidence indicator
├── lib/
│   ├── types.ts                   # TypeScript interfaces
│   ├── categories.ts              # Category + bank definitions
│   ├── fx.ts                      # FX rate fetching + conversion
│   ├── parsers/index.ts           # Bank CSV parsers
│   └── supabase/
│       ├── client.ts              # Browser Supabase client
│       └── server.ts              # Server Supabase client
├── middleware.ts                  # Auth route protection
├── supabase/schema.sql            # Database schema + RLS policies
└── .env.local.example
```

---

## Planned improvements

- [ ] Profile page — change base currency, display name
- [ ] Transfer auto-detection — flag same amount debit+credit across accounts within 3 days
- [ ] Recurring transaction detection
- [ ] CSV export
- [ ] Multiple users sharing a household (shared budgets)
- [ ] Push notifications for budget overspend
- [ ] Mobile app (React Native + same Supabase backend)
