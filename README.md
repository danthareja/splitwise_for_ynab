# Splitwise for YNAB

> Categorize shared expenses with your partner between YNAB and Splitwise

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Background

My partner and I use separate YNAB budgets but we use Splitwise as the source of truth for shared expenses.

If I pay $200 from my debit card at Save On Foods, here's the current manual process to categorize that expense:

1. Categorize $200 transaction from my 'Checking' account as an 'outflow' under the 'Groceries' budget
2. Add a Splitwise expense for $200 'split evenly' in our 'Shared Partner Expenses' group. Splitwise shows I am owed $100
3. Add a new $100 _'inflow'_ transaction into my 'Splitwise' account, also categoried under the 'Groceries' budget

After this, my 'Splitwise' account shows a positive balance of $100 (same as what I'm owed in the Splitwise app), and my 'Groceries' category shows I've spent $100.

## Concept

This project automates steps (2) and (3) above. Here's how:

First, mark a transaction as shared in YNAB:

1. Flag the transaction with a color (configurable in env vars)

Periodically, this app will search for flagged transactions. For each flagged transaction, it will:

1. Add a 'split equally' expense into a Splitwise group
1. Add the corresponding transaction into the 'Splitwise' account in YNAB

## Getting Started

First, install dependencies (requires >= Node v16)

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
