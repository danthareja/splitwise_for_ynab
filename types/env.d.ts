declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string
    NEXTAUTH_URL: string
    NEXTAUTH_SECRET: string
    YNAB_CLIENT_ID: string
    YNAB_CLIENT_SECRET: string
  }
}
