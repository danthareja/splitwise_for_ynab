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
import {
  PartnerJoinedEmail,
  PartnerJoinedEmailProps,
} from "@/emails/partner-joined";
import {
  PartnerDisconnectedEmail,
  PartnerDisconnectedEmailProps,
} from "@/emails/partner-disconnected";
import { TrialEndingEmail, TrialEndingEmailProps } from "@/emails/trial-ending";
import {
  SubscriptionExpiredEmail,
  SubscriptionExpiredEmailProps,
} from "@/emails/subscription-expired";
import {
  GrandfatherAnnouncementEmail,
  GrandfatherAnnouncementEmailProps,
} from "@/emails/grandfather-announcement";
import {
  OnboardingReminderEmail,
  OnboardingReminderEmailProps,
  getOnboardingEmailSubject,
} from "@/emails/onboarding-reminder";

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

interface SendSyncErrorRequiresActionEmailParams extends SyncErrorRequiresActionEmailProps {
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

interface SendPartnerJoinedEmailParams extends PartnerJoinedEmailProps {
  to: string;
}

export async function sendPartnerJoinedEmail({
  to,
  userName,
  partnerName,
}: SendPartnerJoinedEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "Splitwise for YNAB <support@splitwiseforynab.com>",
    to: [to],
    subject: `${partnerName} joined your Splitwise for YNAB account`,
    react: PartnerJoinedEmail({ userName, partnerName }),
    text: await render(PartnerJoinedEmail({ userName, partnerName }), {
      plainText: true,
    }),
  });

  if (error) {
    Sentry.captureException(error);
    console.error(error);
    return { success: false, error };
  }

  return { success: true, data };
}

interface SendPartnerDisconnectedEmailParams extends PartnerDisconnectedEmailProps {
  to: string;
}

export async function sendPartnerDisconnectedEmail({
  to,
  userName,
  primaryName,
  oldGroupName,
  reason = "group_change",
}: SendPartnerDisconnectedEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "Splitwise for YNAB <support@splitwiseforynab.com>",
    to: [to],
    subject: "You've been removed from your partner's Duo plan",
    react: PartnerDisconnectedEmail({
      userName,
      primaryName,
      oldGroupName,
      reason,
    }),
    text: await render(
      PartnerDisconnectedEmail({ userName, primaryName, oldGroupName, reason }),
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

interface SendTrialEndingEmailParams extends TrialEndingEmailProps {
  to: string;
}

export async function sendTrialEndingEmail({
  to,
  userName,
  trialEndsAt,
  planName,
  planPrice,
}: SendTrialEndingEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "Splitwise for YNAB <support@splitwiseforynab.com>",
    to: [to],
    subject: "Your free trial ends in 3 days",
    react: TrialEndingEmail({ userName, trialEndsAt, planName, planPrice }),
    text: await render(
      TrialEndingEmail({ userName, trialEndsAt, planName, planPrice }),
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

interface SendSubscriptionExpiredEmailParams extends SubscriptionExpiredEmailProps {
  to: string;
}

export async function sendSubscriptionExpiredEmail({
  to,
  userName,
  expiredAt,
  isSecondary,
}: SendSubscriptionExpiredEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "Splitwise for YNAB <support@splitwiseforynab.com>",
    to: [to],
    subject: "Your Splitwise for YNAB subscription has ended",
    react: SubscriptionExpiredEmail({ userName, expiredAt, isSecondary }),
    text: await render(
      SubscriptionExpiredEmail({ userName, expiredAt, isSecondary }),
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

interface SendGrandfatherAnnouncementEmailParams extends GrandfatherAnnouncementEmailProps {
  to: string;
}

export async function sendGrandfatherAnnouncementEmail({
  to,
  userName,
}: SendGrandfatherAnnouncementEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "Splitwise for YNAB <support@splitwiseforynab.com>",
    to: [to],
    subject: "You're an early supporter — lifetime free access",
    react: GrandfatherAnnouncementEmail({ userName }),
    text: await render(GrandfatherAnnouncementEmail({ userName }), {
      plainText: true,
    }),
  });

  if (error) {
    Sentry.captureException(error);
    console.error(error);
    return { success: false, error };
  }

  return { success: true, data: {} };
}

interface SendOnboardingReminderEmailParams extends OnboardingReminderEmailProps {
  to: string;
}

export async function sendOnboardingReminderEmail({
  to,
  userName,
  step,
  emailNumber,
  isSecondary,
  unsubscribeUrl,
}: SendOnboardingReminderEmailParams) {
  const subject = getOnboardingEmailSubject(step, emailNumber);

  const { data, error } = await resend.emails.send({
    from: "Splitwise for YNAB <support@splitwiseforynab.com>",
    to: [to],
    subject,
    react: OnboardingReminderEmail({
      userName,
      step,
      emailNumber,
      isSecondary,
      unsubscribeUrl,
    }),
    text: await render(
      OnboardingReminderEmail({
        userName,
        step,
        emailNumber,
        isSecondary,
        unsubscribeUrl,
      }),
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
