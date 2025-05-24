# Splitwise for YNAB

> Sync shared expenses with your partner between YNAB and Splitwise

## Background

My partner and I use separate YNAB plans but we use Splitwise as the source of truth for shared expenses

### When I pay

If I pay $50 for gas with my debit card, here's the manual process to categorize this expense:

1. In YNAB, I categorize the $50 **outflow** in my _Gas/Parking_ category.
2. In Splitwise, I add a $50 **split evenly** expense to our shared group.
3. In YNAB, I add a new $25 **inflow** transaction into a Splitwise cash account, and categorize it back into _Gas/Parking_

After this, YNAB shows I've only spent $25 on my half of gas, and my Splitwise account shows a **positive** balance of $25 (what _I'm owed_ in the Splitwise app)

<img width="400" alt="Screenshot 2025-05-19 at 10 27 31 PM" src="https://github.com/user-attachments/assets/d07b05d5-cf4b-45b2-a9b3-55ef3fd5c202" />

### When she pays

If she pays $100 for our electricity bill, here's the manual process to categorize this expense:

2. In Splitwise, she adds a $100 **split evenly** expense to our shared group.
3. In YNAB, I add a new $50 **outflow** transaction into a Splitwise cash account, and categorize it into _Utilities_

After this, YNAB shows I've spent $50 on my half of the electricity bill, and my Splitwise account would show a **negative** balance of $50 (what _I owe_ in the Splitwise app).

<img width="400" alt="Screenshot 2025-05-22 at 10 11 49 AM" src="https://github.com/user-attachments/assets/b9a44869-4265-4073-bea4-266f22e903fd" />

### Settling up

When we settle up on Splitwise, the transaction is categorized as a transfer between my Splitwise account and my Checking account.

> [!WARNING]
> With this workflow, **the dollars in your fake Splitwise cash account are not spendable**. When the balance is positive (you are owed money), you can assign those dollars in your plan, but they are not in your Checking account yet. You must keep an eye on this and settle up as needed.

## Concept

This project automates steps (2) and (3) above. Here's how:

First, I mark a transaction as shared in YNAB:

1. Flag the transaction with a color (I use blue, this is configurable)

When triggered, this app will search for flagged transactions. For each flagged transaction, it will:

1. Add a **split equally** expense into a Splitwise group
1. Add the corresponding transaction into the Splitwise account in YNAB for both partners

This lets me use Splitwise for shared expenses without ever leaving YNAB.

## FAQs

### What if my partner doesn't use YNAB?

This still works as long as your partner enters an expense into the configured shared group in their Splitwise app.

### What if an expense isn't split evenly?

Enter it directly in the Splitwise app as such.

A common scenario is when you front a full purchase for your partner. In your Splitwise app, add an expense where you're owed the full amount. Both transactions will cancel out in YNAB, and would be a good candidate for a _Reimbursements_ category.

## Self-Hosted Setup

You can deploy your own instance of this app to run automatically without manual intervention.

### Prerequisites

- A free [Vercel](https://vercel.com) account
- A free [Upstash](https://upstash.com/) Redis account
- Your YNAB and Splitwise API credentials

### 1. Fork and Deploy

1. Fork this repository to your GitHub account
2. Connect your GitHub account to Vercel and deploy the fork
3. Note your deployment URL (e.g., `https://your-app.vercel.app`)

### 2. Set up Upstash Redis

1. Create a new Redis database at [Upstash](https://console.upstash.com/)
2. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from your database details
3. Add these as environment variables in your Vercel deployment

### 3. Configure Environment Variables

In your Vercel project settings, add these environment variables:

```
API_SECRET_KEY=your-secret-key-here
UPSTASH_REDIS_REST_URL=your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

### 4. Set up GitHub Actions Secrets

In your forked repository, go to Settings → Secrets and variables → Actions, and add these secrets:

#### API Configuration

- `API_SECRET_KEY` - Same value as your Vercel environment variable
- `API_BASE_URL` - Your Vercel url (e.g. `https://your-app.vercel.app`)

#### Secrets (for "mine" user)

- `YNAB_API_KEY_MINE` - Your YNAB personal access token
- `YNAB_BUDGET_ID_MINE` - Your YNAB budget ID
- `YNAB_SPLITWISE_ACCOUNT_ID_MINE` - Your Splitwise cash account ID in YNAB
- `SPLITWISE_API_KEY_MINE` - Your Splitwise API key
- `SPLITWISE_USER_ID_MINE` - Your Splitwise user ID (numeric)

#### Secrets (for "partner" user, if applicable)

- `YNAB_API_KEY_PARTNER` - Partner's YNAB personal access token
  - Can me same as "mine" if both budgets are on the same YNAB account
- `YNAB_BUDGET_ID_PARTNER` - Partner's YNAB budget ID
- `YNAB_SPLITWISE_ACCOUNT_ID_PARTNER` - Partner's Splitwise cash account ID in YNAB
- `SPLITWISE_API_KEY_PARTNER` - Partner's Splitwise API key (if applicable)
- `SPLITWISE_USER_ID_PARTNER` - Partner's Splitwise user ID (numeric, if applicable)

#### Shared Secrets (required)

- `SPLITWISE_GROUP_ID_SHARED` - Your shared Splitwise group ID

### Step 5: Update GitHub Actions (optional)

If you want to change flag colors, emojis, or currenct, you can edit `./github/workflows/cron.yml`

### How It Works

The GitHub Actions workflow runs every 6 hours and calls your deployed API endpoints with all the necessary configuration. This bypasses the need for manual OAuth flows and web interface interactions.

The sync uses Upstash Redis to store sync state, ensuring transactions aren't processed multiple times and maintaining consistency across runs.

## Development

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Prerequisites

- Node >= v22
- A Postgres database ([Prisma](https://prisma.io/postgres), [Neon](https://neon.tech), or local installation)

### Setup

Set up your environment variables

```bash
cp .env.example .env
vim .env # fill these out
```

Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the main page.
