import { describe, expect, it } from "vitest";
import { prisma } from "../setup";
import { persistFreshOAuthTokensForLinkedAccount } from "@/services/oauth-account-tokens";

describe("persistFreshOAuthTokensForLinkedAccount", () => {
  it("updates tokens for an existing linked OAuth account", async () => {
    const user = await prisma.user.create({
      data: { email: "existing@example.com" },
    });
    await prisma.account.create({
      data: {
        userId: user.id,
        type: "oauth",
        provider: "ynab",
        providerAccountId: "ynab-user-id",
        access_token: "old-access-token",
        refresh_token: "old-refresh-token",
        expires_at: 100,
      },
    });

    const result = await persistFreshOAuthTokensForLinkedAccount(prisma, {
      provider: "ynab",
      providerAccountId: "ynab-user-id",
      access_token: "new-access-token",
      refresh_token: "new-refresh-token",
      expires_at: 200,
      token_type: "Bearer",
      scope: "",
      id_token: undefined,
      session_state: undefined,
    });

    const account = await prisma.account.findUniqueOrThrow({
      where: {
        provider_providerAccountId: {
          provider: "ynab",
          providerAccountId: "ynab-user-id",
        },
      },
    });

    expect(result.count).toBe(1);
    expect(account.access_token).toBe("new-access-token");
    expect(account.refresh_token).toBe("new-refresh-token");
    expect(account.expires_at).toBe(200);
    expect(account.token_type).toBe("Bearer");
  });

  it("does not clear the existing refresh token when the provider omits one", async () => {
    const user = await prisma.user.create({
      data: { email: "preserve-refresh@example.com" },
    });
    await prisma.account.create({
      data: {
        userId: user.id,
        type: "oauth",
        provider: "ynab",
        providerAccountId: "ynab-user-id",
        access_token: "old-access-token",
        refresh_token: "old-refresh-token",
      },
    });

    await persistFreshOAuthTokensForLinkedAccount(prisma, {
      provider: "ynab",
      providerAccountId: "ynab-user-id",
      access_token: "new-access-token",
      refresh_token: undefined,
      expires_at: undefined,
      token_type: undefined,
      scope: undefined,
      id_token: undefined,
      session_state: undefined,
    });

    const account = await prisma.account.findUniqueOrThrow({
      where: {
        provider_providerAccountId: {
          provider: "ynab",
          providerAccountId: "ynab-user-id",
        },
      },
    });

    expect(account.access_token).toBe("new-access-token");
    expect(account.refresh_token).toBe("old-refresh-token");
  });
});
