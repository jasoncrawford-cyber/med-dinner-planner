# Mediterranean Meal Planner

A small Next.js web app that:
- Lets you pick how many **breakfasts, lunches, and dinners** you want for the week
- Enforces **no recipe repeats for 30 days** using local storage history
- Limits **beef to at most 1** meal per plan and uses **fresh fish only** (no canned fish or sardines)
- Guarantees at least one **Spanish or Mexican** option for variety
- Builds a combined **shopping list** that merges duplicate ingredients to save on grocery costs

## Tech
- Next.js 16 (App Router)
- Tailwind CSS

## Requirements
- Node.js **20.9+** (per Next.js docs)

## Setup

1) Install dependencies

```bash
npm install
```

2) Run the app

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

## Notes on recipe content

Recipes are curated for fresh fish (no canned fish or sardines) and authentic Mediterranean flavors. Each card links to the original recipe for full instructions and attribution.

