import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AuthErrorPage from "@/app/auth/error/page";
import { auth } from "@/auth";

describe("auth error recovery page", () => {
  it("offers a direct YNAB restart without requiring a signed-out session", async () => {
    vi.mocked(auth).mockClear();
    const page = await AuthErrorPage({
      searchParams: Promise.resolve({ error: "OAuthStateExpired" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain(
      "Your sign-in attempt expired or is no longer valid.",
    );
    expect(html).toContain("Restart YNAB sign-in");
    expect(html).not.toContain('href="/auth/signin"');
    // Recovery must not gate on auth() or redirect signed-in users away.
    expect(auth).not.toHaveBeenCalled();
  });

  it("does not present unknown configuration failures as expired sign-ins", async () => {
    const page = await AuthErrorPage({
      searchParams: Promise.resolve({ error: "Configuration" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Configuration Error");
    expect(html).not.toContain("Restart YNAB sign-in");
  });
});
