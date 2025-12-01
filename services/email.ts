import { Resend } from "resend";
import { render } from "@react-email/render";
import * as Sentry from "@sentry/nextjs";
import { WelcomeEmail, WelcomeEmailProps } from "@/emails/welcome";
import { SyncErrorEmail, SyncErrorEmailProps } from "@/emails/sync-error";
import {
  SyncErrorRequiresActionEmail,
  SyncErrorRequiresActionEmailProps,
} from "@/emails/sync-error-requires-action";
import SyncPartialEmail, { SyncPartialEmailProps } from "@/emails/sync-partial";
import {
  PartnerInviteEmail,
  PartnerInviteEmailProps,
} from "@/emails/partner-invite";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendWelcomeEmailParams extends WelcomeEmailProps {
  to: string;
}

export async function sendWelcomeEmail({
  to,
  userName,
}: SendWelcomeEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "Splitwise for YNAB <support@splitwiseforynab.com>",
    to: [to],
    subject: "Welcome to Splitwise for YNAB!",
    react: WelcomeEmail({ userName }),
    text: await render(WelcomeEmail({ userName }), {
      plainText: true,
    }),
  });

  if (error) {
    Sentry.captureException(error);
    console.error(error);
  }

  return data;
}

interface SendSyncErrorEmailParams extends SyncErrorEmailProps {
  to: string;
}

export async function sendSyncErrorEmail({
  to,
  userName,
  errorMessage,
}: SendSyncErrorEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "Splitwise for YNAB <support@splitwiseforynab.com>",
    to: [to],
    subject: "Your recent sync failed",
    react: SyncErrorEmail({ userName, errorMessage }),
    text: await render(SyncErrorEmail({ userName, errorMessage }), {
      plainText: true,
    }),
  });

  if (error) {
    Sentry.captureException(error);
    console.error(error);
  }

  return data;
}

interface SendSyncErrorRequiresActionEmailParams
  extends SyncErrorRequiresActionEmailProps {
  to: string;
}

export async function sendSyncErrorRequiresActionEmail({
  to,
  userName,
  errorMessage,
  suggestedFix,
}: SendSyncErrorRequiresActionEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "Splitwise for YNAB <support@splitwiseforynab.com>",
    to: [to],
    subject: "[ACTION REQUIRED] Your account has temporarily been disabled",
    react: SyncErrorRequiresActionEmail({
      userName,
      errorMessage,
      suggestedFix,
    }),
    text: await render(
      SyncErrorRequiresActionEmail({
        userName,
        errorMessage,
        suggestedFix,
      }),
      {
        plainText: true,
      },
    ),
  });

  if (error) {
    Sentry.captureException(error);
    console.error(error);
  }

  return data;
}

interface SendSyncPartialEmailParams extends SyncPartialEmailProps {
  to: string;
}

export async function sendSyncPartialEmail({
  to,
  userName,
  failedExpenses,
  failedTransactions,
  currencyCode,
}: SendSyncPartialEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "Splitwise for YNAB <support@splitwiseforynab.com>",
    to: [to],
    subject: "Your recent sync completed with some errors",
    react: SyncPartialEmail({
      userName,
      failedExpenses,
      failedTransactions,
      currencyCode,
    }),
    text: await render(
      SyncPartialEmail({
        userName,
        failedExpenses,
        failedTransactions,
        currencyCode,
      }),
      {
        plainText: true,
      },
    ),
  });

  if (error) {
    Sentry.captureException(error);
    console.error(error);
  }

  return data;
}

interface SendPartnerInviteEmailParams extends PartnerInviteEmailProps {
  to: string;
}

export async function sendPartnerInviteEmail({
  to,
  partnerName,
  inviterName,
  groupName,
  inviteUrl,
}: SendPartnerInviteEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "Splitwise for YNAB <support@splitwiseforynab.com>",
    to: [to],
    subject: `${inviterName} invited you to sync expenses together`,
    react: PartnerInviteEmail({
      partnerName,
      inviterName,
      groupName,
      inviteUrl,
    }),
    text: await render(
      PartnerInviteEmail({ partnerName, inviterName, groupName, inviteUrl }),
      { plainText: true },
    ),
  });

  if (error) {
    Sentry.captureException(error);
    console.error(error);
    return { success: false, error };
  }

  return { success: true, data };
}
