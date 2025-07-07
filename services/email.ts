import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
// import { WelcomeEmail } from '@/emails/welcome';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendWelcomeEmailParams {
  to: string;
  userName?: string;
}

export async function sendWelcomeEmail({
  to,
  userName,
}: SendWelcomeEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "Dan Thareja <dan@splitwiseforynab.com>",
    to: [to],
    subject: "How's it going with Splitwise for YNAB?",
    scheduledAt: "in 24 hours",
    // react: WelcomeEmail({ userEmail: to, userName }),
    text: `Hi ${userName || "there"},

I hope you're enjoying Splitwise for YNAB! I wanted to reach out personally to see how things are going with your setup.

How's your experience been so far? If you're running into any issues or have questions about getting the most out of the integration, I'm here to help.

Also curious - how did you hear about us?

Always happy to help or just hear how it's going.

Best,
Dan Thareja
Founder, Splitwise for YNAB`,
  });

  if (error) {
    Sentry.captureException(error);
    console.error(error);
  }

  return data;
}
