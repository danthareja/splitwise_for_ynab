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
    heading: "3 minutes to automatic expense syncing",
    body: "You connected Splitwise — just confirm your profile and continue. Once you're done, your expenses sync between YNAB and Splitwise automatically.",
  },
  "0.2": {
    subject: "Your Splitwise account is connected and ready",
    heading: "Your Splitwise is connected — keep going",
    body: "A few more steps and every shared expense shows up in YNAB automatically. No more copying amounts between apps.",
  },
  "0.3": {
    subject: "Your setup is waiting for you",
    heading: "Still want automatic expense syncing?",
    body: "Totally understand if you got busy. Your Splitwise connection is still active — pick up where you left off whenever you have a few minutes.",
  },

  // Step 1: Needs to choose Solo vs Dual
  "1.1": {
    subject: "Quick question: solo or duo?",
    heading: "One quick choice, then we keep moving",
    body: "Do you split expenses solo (just you use YNAB), or duo (you both do)? Pick your mode and you're one step closer to automatic syncing.",
  },
  "1.2": {
    subject: "Solo or duo — here's the difference",
    heading: "Not sure which to pick? Here's the short version",
    body: "Solo: you track shared expenses and your partner doesn't use YNAB. Duo: both of you get automatic syncing. Either way, setup takes a couple more minutes.",
  },
  "1.3": {
    subject: "You're 3 steps from automatic syncing",
    heading: "Your free trial clock hasn't started yet",
    body: "Just a heads up — your trial doesn't start until setup is complete. Pick your mode now and you won't lose any free days.",
  },

  // Step 2: Needs YNAB config
  "2.1": {
    subject: "Let's connect your YNAB budget",
    heading: "Tell us where expenses should land",
    body: "Pick your YNAB budget and the account where Splitwise transactions should appear. Takes about 2 minutes.",
  },
  "2.2": {
    subject: "2 minutes to connect YNAB",
    heading: "Almost there — just need your YNAB settings",
    body: "Select your budget and the account for Splitwise transactions. Once this is done, you're one step from syncing.",
  },
  "2.3": {
    subject: "You're halfway through setup",
    heading: "Your trial hasn't started yet — no days wasted",
    body: "Your Splitwise is connected and waiting. Finish your YNAB settings and you'll be syncing in minutes.",
  },

  // Step 3: Needs Splitwise config
  "3.1": {
    subject: "One more step: pick your Splitwise group",
    heading: "Last settings, then you're syncing",
    body: "Select which Splitwise group to sync and pick your currency. After this, you can start your free trial.",
  },
  "3.2": {
    subject: "You're one step from automatic syncing",
    heading: "So close — just confirm your Splitwise group",
    body: "Pick your group and currency, and you're done with setup. Your first sync will run automatically.",
  },
  "3.3": {
    subject: "Everything's connected, just need one confirmation",
    heading: "Your trial is waiting on this last step",
    body: "YNAB and Splitwise are both connected. Confirm your group settings and start your free trial — we'll handle the rest.",
  },

  // Step 4: Needs payment (solo/primary only)
  "4.1": {
    subject: "Start your free trial",
    heading: "Everything's ready — start syncing",
    body: `Your YNAB and Splitwise are configured. Start your free trial and your first sync runs automatically. No charge for ${TRIAL_DAYS} days.`,
  },
  "4.2": {
    subject: "Your first sync is ready to run",
    heading: "One click and expenses sync automatically",
    body: `All your settings are saved. Start your ${TRIAL_DAYS}-day free trial and your first sync runs right away.`,
  },
  "4.3": {
    subject: `${TRIAL_DAYS} days free — cancel anytime`,
    heading: "You did all the hard work already",
    body: "Setup is done. Start your free trial and stop entering Splitwise expenses into YNAB by hand. Cancel anytime.",
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
