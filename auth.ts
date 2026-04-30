import NextAuth from "next-auth";
import { PrismaAdapter } from "@/services/auth-prisma-adapter";
import { prisma } from "@/db";
import { reportAuthError } from "@/lib/auth-sentry";

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV === "development",
  adapter: PrismaAdapter(prisma),
  logger: {
    error: reportAuthError,
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ account, profile }) {
      const p = profile as Record<string, unknown> | undefined;
      const error = p?.error as { name?: string; detail?: string } | undefined;
      if (account?.provider === "ynab" && error) {
        const name = error.name ?? "unknown";
        const detail = error.detail ?? "";
        return `/auth/error?error=YnabApiError&name=${encodeURIComponent(name)}&detail=${encodeURIComponent(detail)}`;
      }
      return true;
    },
  },
  providers: [
    {
      id: "ynab",
      name: "YNAB",
      type: "oauth",
      checks: ["state"],
      authorization: {
        url: "https://app.ynab.com/oauth/authorize",
        params: { scope: "" },
      },
      token: "https://app.ynab.com/oauth/token",
      userinfo: {
        url: "https://api.ynab.com/v1/user",
      },
      profile(profile) {
        if (profile.error) {
          return { id: "ynab-error", email: "" };
        }
        return {
          id: profile.data.user.id,
          email: `user-${profile.data.user.id}@ynab-generated.com`,
        };
      },
    },
    {
      id: "splitwise",
      name: "Splitwise",
      type: "oauth",
      checks: ["state"],
      authorization: {
        url: "https://secure.splitwise.com/oauth/authorize",
        params: { scope: "" },
      },
      token: {
        url: "https://secure.splitwise.com/oauth/token",
        params: {
          grant_type: "authorization_code",
        },
      },
      userinfo: {
        url: "https://secure.splitwise.com/api/v3.0/get_current_user",
      },
      profile(profile) {
        return {
          id: profile.user.id.toString(),
          email: profile.user.email,
          firstName: profile.user.first_name,
          lastName: profile.user.last_name,
          name: `${profile.user.first_name} ${profile.user.last_name}`,
          image: profile.user.picture.medium,
        };
      },
    },
  ],
});
