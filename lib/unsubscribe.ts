import crypto from "crypto";

const SECRET = process.env.CRON_SECRET!;

/**
 * Generate an HMAC-signed unsubscribe token for a user + category.
 * Token format: base64url(userId:category):base64url(hmac)
 */
export function generateUnsubscribeToken(
  userId: string,
  category: string,
): string {
  const payload = `${userId}:${category}`;
  const payloadEncoded = Buffer.from(payload).toString("base64url");
  const hmac = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  return `${payloadEncoded}.${hmac}`;
}

/**
 * Verify an unsubscribe token and extract the userId + category.
 * Returns null if the token is invalid or tampered with.
 */
export function verifyUnsubscribeToken(
  token: string,
): { userId: string; category: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const payloadEncoded = parts[0]!;
  const hmac = parts[1]!;

  let payload: string;
  try {
    payload = Buffer.from(payloadEncoded, "base64url").toString("utf-8");
  } catch {
    return null;
  }

  const expectedHmac = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");

  if (
    hmac.length !== expectedHmac.length ||
    !crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))
  ) {
    return null;
  }

  const colonIndex = payload.indexOf(":");
  if (colonIndex === -1) return null;

  const userId = payload.substring(0, colonIndex);
  const category = payload.substring(colonIndex + 1);

  if (!userId || !category) return null;

  return { userId, category };
}
