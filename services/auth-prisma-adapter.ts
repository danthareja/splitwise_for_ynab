/**
 * Forked from
 * @auth/prisma-adapter
 */
import { Prisma } from "@/prisma/generated/client";
import { generateApiKey } from "./api-key";
import type { PrismaClient } from "@/prisma/generated/client";
import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
} from "@auth/core/adapters";

export function PrismaAdapter(prisma: PrismaClient): Adapter {
  const p = prisma;
  return {
    // We need to let Prisma generate the ID because our default UUID is incompatible with MongoDB
    // @ts-expect-error - Prisma Client type incompatible with AdapterUser
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createUser: ({ id, apiKey, ...data }) => {
      const key = apiKey ?? generateApiKey();
      return p.user.create(stripUndefined({ apiKey: key, ...data }));
    },
    // @ts-expect-error - Prisma Client type incompatible with AdapterUser
    getUser: (id) =>
      p.user.findUnique({
        where: { id },
        // THIS IS THE MAIN REASON FOR THIS ADAPTER. IDK IF IT'S A GOOD IDEA
        // cacheStrategy: {
        //   ttl: 60,
        //   swr: 60,
        // },
      }),
    // @ts-expect-error - Prisma Client type incompatible with AdapterUser
    getUserByEmail: (email) => p.user.findUnique({ where: { email } }),
    async getUserByAccount(provider_providerAccountId) {
      const account = await p.account.findUnique({
        where: { provider_providerAccountId },
        include: { user: true },
        // THIS IS THE MAIN REASON FOR THIS ADAPTER. IDK IF IT'S A GOOD IDEA
        // cacheStrategy: {
        //   ttl: 60,
        //   swr: 60,
        // },
      });
      return (account?.user as AdapterUser) ?? null;
    },
    updateUser: ({ id, ...data }) =>
      p.user.update({
        where: { id },
        ...stripUndefined(data),
      }) as Promise<AdapterUser>,
    deleteUser: (id) =>
      p.user.delete({ where: { id } }) as Promise<AdapterUser>,
    linkAccount: (data) =>
      p.account.create({ data }) as unknown as AdapterAccount,
    unlinkAccount: (provider_providerAccountId) =>
      p.account.delete({
        where: { provider_providerAccountId },
      }) as unknown as AdapterAccount,
    async getSessionAndUser(sessionToken) {
      const userAndSession = await p.session.findUnique({
        where: { sessionToken },
        include: { user: true },
        // THIS IS THE MAIN REASON FOR THIS ADAPTER. IDK IF IT'S A GOOD IDEA
        // cacheStrategy: {
        //   ttl: 60,
        //   swr: 60,
        // },
      });
      if (!userAndSession) return null;
      const { user, ...session } = userAndSession;
      return { user, session } as {
        user: AdapterUser;
        session: AdapterSession;
      };
    },
    createSession: (data) => p.session.create(stripUndefined(data)),
    updateSession: (data) =>
      p.session.update({
        where: { sessionToken: data.sessionToken },
        ...stripUndefined(data),
      }),
    deleteSession: (sessionToken) =>
      p.session.delete({ where: { sessionToken } }),
    async createVerificationToken(data) {
      const verificationToken = await p.verificationToken.create(
        stripUndefined(data),
      );
      if ("id" in verificationToken && verificationToken.id)
        delete verificationToken.id;
      return verificationToken;
    },
    async useVerificationToken(identifier_token) {
      try {
        const verificationToken = await p.verificationToken.delete({
          where: { identifier_token },
        });
        if ("id" in verificationToken && verificationToken.id)
          delete verificationToken.id;
        return verificationToken;
      } catch (error: unknown) {
        // If token already used/deleted, just return null
        // https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        )
          return null;
        throw error;
      }
    },
    async getAccount(providerAccountId, provider) {
      return p.account.findFirst({
        where: { providerAccountId, provider },
        // THIS IS THE MAIN REASON FOR THIS ADAPTER. IDK IF IT'S A GOOD IDEA
        // cacheStrategy: {
        //   ttl: 60 * 5, // 5 minutes
        // },
      }) as Promise<AdapterAccount | null>;
    },
    async createAuthenticator(data) {
      return p.authenticator.create(stripUndefined(data));
    },
    async getAuthenticator(credentialID) {
      return p.authenticator.findUnique({
        where: { credentialID },
      });
    },
    async listAuthenticatorsByUserId(userId) {
      return p.authenticator.findMany({
        where: { userId },
      });
    },
    async updateAuthenticatorCounter(credentialID, counter) {
      return p.authenticator.update({
        where: { credentialID },
        data: { counter },
      });
    },
  };
}

/** @see https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/null-and-undefined */
function stripUndefined<T>(obj: T) {
  const data = {} as any;
  for (const key in obj) {
    const value = obj[key];
    // Skip undefined and null values (Prisma boolean fields don't accept null)
    if (value !== undefined && value !== null) {
      data[key] = value;
    } else if (value === null) {
      // For fields that can be null (like strings), we need to handle them
      // Check if it's a field that should accept null (string fields typically do)
      // For boolean fields, we skip them (don't set them at all)
      const fieldName = String(key);
      if (!fieldName.includes("disabled") && !fieldName.includes("approved")) {
        data[key] = value;
      }
    }
  }
  return { data };
}
