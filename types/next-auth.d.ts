import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      apiKey?: string | null;
    } & DefaultSession["user"];
    ynabAccessToken?: string;
  }
}
