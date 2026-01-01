# Mediterranean Dinner Planner (5-day)

A small Next.js web app that:
- Pulls **Mediterranean + Dinner** recipes from Edamam
- Generates **5 dinners (Mon–Fri)** for the week you choose
- Enforces **no recipe repeats for 30 days**
- Limits **beef to at most 1** dinner in the 5-day plan
- Builds an **aggregated shopping list** (scaled by servings) via Edamam Shopping List API

## Tech
- Next.js 16 (App Router)
- Prisma + SQLite (easy local setup)
- Tailwind CSS

## Requirements
- Node.js **20.9+** (per Next.js docs)
- An Edamam app_id + app_key for Recipe Search + Shopping List

## Setup

1) Install dependencies

```bash
npm install
```

2) Create `.env`

```bash
cp .env.example .env
```

Fill in:

- `EDAMAM_APP_ID`
- `EDAMAM_APP_KEY`

3) Create the database

```bash
npx prisma migrate dev --name init
```

4) Run the app

```bash
npm run dev
```

Open http://localhost:3000

## Push to GitHub

```bash
git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## Notes on recipe content + attribution

Edamam’s Recipe Search API returns **web recipes** (third-party). This app links to the recipe source URL for full instructions, and includes the required Edamam attribution badge in the footer.

