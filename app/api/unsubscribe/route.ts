import { prisma } from "@/db";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new Response(
      htmlPage("Invalid Link", "This unsubscribe link is missing or invalid."),
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      },
    );
  }

  const result = verifyUnsubscribeToken(token);

  if (!result) {
    return new Response(
      htmlPage(
        "Invalid Link",
        "This unsubscribe link is invalid or has been tampered with.",
      ),
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      },
    );
  }

  const { userId, category } = result;

  // Upsert to handle duplicate unsubscribe clicks
  await prisma.emailUnsubscribe.upsert({
    where: { userId_category: { userId, category } },
    update: {}, // Already unsubscribed, no-op
    create: { userId, category },
  });

  return new Response(
    htmlPage(
      "Unsubscribed",
      `You've been unsubscribed from ${category} emails. You won't receive these reminders anymore.`,
    ),
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    },
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlPage(title: string, message: string): string {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - Splitwise for YNAB</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #FDFBF7;
      color: #1a1a1a;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 40px;
      max-width: 440px;
      text-align: center;
    }
    h1 { font-size: 24px; margin: 0 0 12px; }
    p { color: #6b7280; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
  </div>
</body>
</html>`;
}
