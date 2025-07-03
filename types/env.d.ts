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
  }
}
