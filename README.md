# Splitwise for YNAB

> Sync shared expenses with your partner between YNAB and Splitwise

## Background

My partner and I use separate YNAB budgets but we use Splitwise as the source of truth for shared expenses.

If I pay $50 for gas with my debit card, here's the manual process to categorize that expense:

1. In YNAB, I categorize the $50 **outflow** in my *Gas/Parking* category.
2. In Splitwise, I add a $50 *split evenly* expense to our shared group.
3. In YNAB, I add a new $25 **inflow** transaction into a Splitwise cash account, and categorize it back into *Gas/Parking*

After this, YNAB shows I've only really spent $25 on *Gas/Parking*, and my Splitwise account shows a positive balance of $25 (what I'm owed in the Splitwise app)

<img width="400" alt="Screenshot 2025-05-19 at 10 27 31 PM" src="https://github.com/user-attachments/assets/d07b05d5-cf4b-45b2-a9b3-55ef3fd5c202" />

When we settle up on Splitwise, the transaction is categorized as a transfer between my Splitwise account and my Checking account.

## Concept

This project automates steps (2) and (3) above. Here's how:

First, I mark a transaction as shared in YNAB:

1. Flag the transaction with a color (I use blue, this is configurable)

When triggered, this app will search for flagged transactions. For each flagged transaction, it will:

1. Add a *split equally* expense into a Splitwise group
1. Add the corresponding transaction into the Splitwise account in YNAB for both partners

This lets me use Splitwise for shared expenses without ever leaving YNAB.

## Getting Started

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

### Prerequisites
* Node >= v16
* A free [Upstash](https://upstash.com/) account

### Setup

Set up your environment variables

```bash
cp .env.example .env.local
vim .env.local # fill these out
```

> NOTE: `YNAB_FLAG_COLOR` can be any YNAB color except `green`. This is hardcoded as the success value.

Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the main page.

To kick off a sync:
1. In YNAB, flag a transaction with your defined `YNAB_FLAG_COLOR`
2. Enter your defined `API_SECRET_KEY_LIST` as the password, and press **Sync**

It worked if you see the flagged transactions turn green, and a new entry into your Splitwise app and account.

