import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      image?: string | null;
      apiKey?: string | null;
      disabled?: boolean | null;
      disabledReason?: string | null;
      suggestedFix?: string | null;
      // Subscription fields for performance (avoid DB queries)
      subscriptionTier?: string;
      subscriptionStatus?: string;
      subscriptionCurrentPeriodEnd?: Date | null;
    } & DefaultSession["user"];
    ynabAccessToken?: string;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    apiKey?: string | null;
    disabled?: boolean | null;
    disabledReason?: string | null;
    suggestedFix?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    subscriptionTier?: string;
    subscriptionStatus?: string;
    subscriptionCurrentPeriodEnd?: Date | null;
  }
}
