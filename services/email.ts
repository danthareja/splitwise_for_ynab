import { Resend } from 'resend';
import * as Sentry from '@sentry/nextjs';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendWelcomeEmailParams {
  to: string;
  userName?: string;
}

export async function sendWelcomeEmail({ to, userName }: SendWelcomeEmailParams) {
  const { data, error } = await resend.emails.send({
    from: 'Dan Thareja <dan@splitwiseforynab.com>',
    to: [to],
    subject: "How's it going with Splitwise for YNAB?",
    replyTo: 'support@splitwiseforynab.com',
    text: `Hi ${userName || 'there'},

I hope you're enjoying Splitwise for YNAB! I wanted to reach out personally to see how things are going with your setup.

Are you finding it easy to sync your Splitwise expenses with YNAB? If you're running into any issues or have questions about getting the most out of the integration, I'm here to help.

Just reply to this email and I'll get back to you as soon as possible.

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