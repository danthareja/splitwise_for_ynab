import type { PrismaClient } from "@/prisma/generated/client";

type OAuthTokenAccount = {
  provider?: string;
  providerAccountId?: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;
};

/**
 * Auth.js does not update adapter Account rows when a user signs in with an
 * OAuth account that is already linked. Persist the fresh token set so external
 * revocations can be repaired by completing OAuth again.
 */
export async function persistFreshOAuthTokensForLinkedAccount(
  prisma: PrismaClient,
  account: OAuthTokenAccount | null | undefined,
) {
  if (!account?.provider || !account.providerAccountId) {
    return { count: 0 };
  }

  const data: Record<string, string | number | Date> = {
    updatedAt: new Date(),
  };

  if (account.access_token) {
    data.access_token = account.access_token;
  }

  if (account.refresh_token) {
    data.refresh_token = account.refresh_token;
  }

  if (typeof account.expires_at === "number") {
    data.expires_at = account.expires_at;
  }

  if (account.token_type) {
    data.token_type = account.token_type;
  }

  if (account.scope) {
    data.scope = account.scope;
  }

  if (account.id_token) {
    data.id_token = account.id_token;
  }

  if (account.session_state) {
    data.session_state = account.session_state;
  }

  if (Object.keys(data).length === 1) {
    return { count: 0 };
  }

  return prisma.account.updateMany({
    where: {
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    },
    data,
  });
}
