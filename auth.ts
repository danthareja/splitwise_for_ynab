import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    {
      id: "ynab",
      name: "YNAB",
      type: "oauth",
      authorization: {
        url: "https://app.youneedabudget.com/oauth/authorize",
        params: { scope: "" },
      },
      token: "https://api.youneedabudget.com/oauth/token",
      userinfo: {
        url: "https://api.youneedabudget.com/v1/user",
      },
      profile(profile) {
        return {
          id: profile.data.user.id,
          email: `user-${profile.data.user.id}@ynab-generated.com`,
          name: "You",
        };
      },
    },
    {
      id: "splitwise",
      name: "Splitwise",
      type: "oauth",
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
          name: `${profile.user.first_name} ${profile.user.last_name}`,
          image: profile.user.picture.medium,
        };
      },
    },
  ],
  // callbacks: {
  //   async session({ session, user }) {
  //     if (session.user) {
  //       session.user.id = user.id
  //     }
  //     return session
  //   },
  // },
});
