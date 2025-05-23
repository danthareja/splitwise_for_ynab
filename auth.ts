import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
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
          name: "YNAB User",
        }
      },
    },
  ]
})
