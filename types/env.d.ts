declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;
    YNAB_CLIENT_ID: string;
    YNAB_CLIENT_SECRET: string;
    CRON_SECRET?: string;
    USER_SYNC_MAX_REQUESTS?: string;
    USER_SYNC_WINDOW_SECONDS?: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_PRICE_ID_MONTHLY: string;
    STRIPE_PRICE_ID_YEARLY: string;
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  }
}
