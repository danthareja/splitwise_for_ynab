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
    } & DefaultSession["user"];
    ynabAccessToken?: string;
  }
}
