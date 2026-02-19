import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, baseUrl } from "./components/email-layout";
import { emailStyles } from "./components/email-styles";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";
import { TRIAL_DAYS } from "@/lib/stripe-pricing";

export interface OnboardingReminderEmailProps {
  userName?: string;
  step: number; // 0-4
  emailNumber: number; // 1-3
  unsubscribeUrl?: string;
}

type EmailCopy = {
  subject: string;
  heading: string;
  body: string;
};

const emailCopy: Record<string, EmailCopy> = {
  // Step 0: Connected Splitwise, hasn't clicked Continue
  "0.1": {
    subject: "You're almost set up",
    heading: "You're almost set up",
    body: "You connected Splitwise! Just confirm your profile and continue to finish setup. Takes about 3 minutes.",
  },
  "0.2": {
    subject: "Your Splitwise account is connected and ready",
    heading: "Your Splitwise account is connected",
    body: "Quick reminder that your Splitwise account is connected. Just a few more steps and your expenses will sync automatically.",
  },
  "0.3": {
    subject: "Your setup is waiting for you",
    heading: "Your setup is waiting for you",
    body: "You connected Splitwise but haven't finished setting up. Come back and complete setup whenever you're ready. It only takes a few minutes.",
  },

  // Step 1: Needs to choose Solo vs Dual
  "1.1": {
    subject: "Quick question: solo or duo?",
    heading: "Quick question: solo or duo?",
    body: "One quick choice and you're moving. Do you split expenses solo, or do you both use YNAB?",
  },
  "1.2": {
    subject: "Solo or duo: here's the difference",
    heading: "Solo or duo: here's the difference",
    body: "Solo means you track shared expenses and your partner doesn't use YNAB. Duo means both of you sync. Pick your mode and keep going.",
  },
  "1.3": {
    subject: "You're 3 steps away from automated syncing",
    heading: "You're 3 steps away",
    body: "Pick your mode and you'll be syncing in minutes.",
  },

  // Step 2: Needs YNAB config
  "2.1": {
    subject: "Let's connect your YNAB budget",
    heading: "Let's connect your YNAB budget",
    body: "Pick your budget and phantom account. Takes about 2 minutes.",
  },
  "2.2": {
    subject: "Your YNAB setup takes 2 minutes",
    heading: "Your YNAB setup takes 2 minutes",
    body: "Just select your budget and the account where Splitwise transactions should appear.",
  },
  "2.3": {
    subject: "Almost there: just need your YNAB settings",
    heading: "Almost there",
    body: "You're halfway through setup. Connect your YNAB budget and you're nearly done.",
  },

  // Step 3: Needs Splitwise config
  "3.1": {
    subject: "One more step: pick your Splitwise group",
    heading: "One more step",
    body: "Select which group to sync and choose your sync emoji.",
  },
  "3.2": {
    subject: "You're so close to automated syncing",
    heading: "You're so close",
    body: "Just pick your Splitwise group and currency, and you're ready to go.",
  },
  "3.3": {
    subject: "Last config step, then you're done",
    heading: "Last config step",
    body: "You've connected everything. Just confirm your Splitwise group settings and start your free trial.",
  },

  // Step 4: Needs payment (solo/primary only)
  "4.1": {
    subject: "Start your free trial",
    heading: "Start your free trial",
    body: `Everything is configured. Start your free trial to begin syncing. No charge for ${TRIAL_DAYS} days.`,
  },
  "4.2": {
    subject: "Your setup is complete, just start your trial",
    heading: "Your setup is complete",
    body: "All your settings are saved. Activate your free trial and your first sync runs automatically.",
  },
  "4.3": {
    subject: `${TRIAL_DAYS} days free, cancel anytime`,
    heading: `${TRIAL_DAYS} days free, cancel anytime`,
    body: "Start your free trial and cancel anytime. Your YNAB and Splitwise are ready to sync.",
  },
};

export function getOnboardingEmailSubject(
  step: number,
  emailNumber: number,
): string {
  const copy = emailCopy[`${step}.${emailNumber}`];
  return copy?.subject ?? "Continue setting up Splitwise for YNAB";
}

export const OnboardingReminderEmail = ({
  userName = "there",
  step = 0,
  emailNumber = 1,
  unsubscribeUrl,
}: OnboardingReminderEmailProps) => {
  const copy = emailCopy[`${step}.${emailNumber}`] ?? emailCopy["0.1"]!;
  const previewText = copy.body;

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>{copy.heading}</Heading>

      <Text style={emailStyles.text}>Hey {userName},</Text>

      <Text style={emailStyles.text}>{copy.body}</Text>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={`${baseUrl}/dashboard/setup`}>
          Continue Setup
        </Button>
      </Section>

      <HelpSection />

      <EmailFooter
        reason="because you started setting up Splitwise for YNAB but haven't finished"
        unsubscribeUrl={unsubscribeUrl}
      />
    </EmailLayout>
  );
};

OnboardingReminderEmail.PreviewProps = {
  userName: "Sarah",
  step: 1,
  emailNumber: 1,
  unsubscribeUrl: "https://splitwiseforynab.com/api/unsubscribe?token=example",
} as OnboardingReminderEmailProps;

export default OnboardingReminderEmail;
