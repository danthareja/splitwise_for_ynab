import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, baseUrl } from "./components/email-layout";
import { emailStyles } from "./components/email-styles";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";

export interface WinBackEmailProps {
  userName?: string;
  emailNumber?: number;
  unsubscribeUrl?: string;
}

type WinBackCopy = {
  subject: string;
  heading: string;
  body: string;
};

const winBackCopy: Record<number, WinBackCopy> = {
  1: {
    subject: "Your settings are still saved",
    heading: "Your settings are still saved",
    body: "Your Splitwise and YNAB configuration is still here. Re-subscribe and your next sync runs automatically.",
  },
  2: {
    subject: "Your expenses aren't syncing",
    heading: "Your expenses aren't syncing",
    body: "Since your subscription ended, your expenses haven't been syncing. Pick up where you left off.",
  },
  3: {
    subject: "We'd love to have you back",
    heading: "We'd love to have you back",
    body: "Your settings are saved and ready to go. Re-subscribe anytime to start syncing again.",
  },
};

export function getWinBackEmailSubject(emailNumber: number): string {
  return winBackCopy[emailNumber]?.subject ?? "We'd love to have you back";
}

export const WinBackEmail = ({
  userName = "there",
  emailNumber = 1,
  unsubscribeUrl,
}: WinBackEmailProps) => {
  const copy = winBackCopy[emailNumber] ?? winBackCopy[1]!;
  const previewText = copy.body;

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>{copy.heading}</Heading>

      <Text style={emailStyles.text}>Hey {userName},</Text>

      <Text style={emailStyles.text}>{copy.body}</Text>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button
          style={emailStyles.button}
          href={`${baseUrl}/dashboard/settings`}
        >
          Re-subscribe
        </Button>
      </Section>

      <HelpSection />

      <EmailFooter
        reason="because your Splitwise for YNAB subscription has ended"
        unsubscribeUrl={unsubscribeUrl}
      />
    </EmailLayout>
  );
};

WinBackEmail.PreviewProps = {
  userName: "Alex",
  emailNumber: 1,
  unsubscribeUrl: "https://splitwiseforynab.com/api/unsubscribe?token=example",
} as WinBackEmailProps;

export default WinBackEmail;
