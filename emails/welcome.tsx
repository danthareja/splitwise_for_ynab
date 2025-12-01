import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, baseUrl } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";

export interface WelcomeEmailProps {
  userName?: string;
  maxSyncRequests?: number;
  syncWindowMinutes?: number;
}

export const WelcomeEmail = ({
  userName = "there",
  maxSyncRequests = 2,
  syncWindowMinutes = 60,
}: WelcomeEmailProps) => {
  const previewText = `Welcome to Splitwise for YNAB — you're all set!`;

  const formatWindow = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    }
    return `${minutes} minutes`;
  };

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>Welcome aboard, {userName}! 🎉</Heading>

      <Text style={emailStyles.text}>
        You&apos;re all set up and ready to go. From now on, your shared
        expenses will sync automatically between YNAB and Splitwise.
      </Text>

      <Section style={highlightBox}>
        <Text style={highlightText}>
          <strong>What happens next:</strong> We sync your accounts daily at 1pm
          ET. Flag a transaction in YNAB or add an expense in Splitwise—we
          handle the rest.
        </Text>
      </Section>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={`${baseUrl}/dashboard`}>
          Go to Dashboard
        </Button>
      </Section>

      <Section style={tipsSection}>
        <Heading style={emailStyles.h3}>Quick tips</Heading>
        <Text style={emailStyles.text}>
          • <strong>Manual sync:</strong> Need to sync right now? Use the button
          on your dashboard ({maxSyncRequests}x per{" "}
          {formatWindow(syncWindowMinutes)}).
        </Text>
        <Text style={emailStyles.text}>
          • <strong>Custom splits:</strong> Your default split ratio is set in
          Settings. For one-off different ratios, add the expense directly in
          Splitwise.
        </Text>
        <Text style={emailStyles.text}>
          • <strong>Settling up:</strong> When you settle in Splitwise, transfer
          funds between your accounts in YNAB.
        </Text>
      </Section>

      <HelpSection />

      <EmailFooter reason="because you completed setup for Splitwise for YNAB" />
    </EmailLayout>
  );
};

const highlightBox = {
  backgroundColor: colors.emeraldLight,
  border: `1px solid ${colors.emeraldBorder}`,
  borderRadius: "12px",
  padding: "20px",
  margin: "24px 0",
};

const highlightText = {
  ...emailStyles.text,
  color: "#065f46",
  margin: 0,
};

const tipsSection = {
  marginTop: "32px",
};

WelcomeEmail.PreviewProps = {
  userName: "John",
  maxSyncRequests: 2,
  syncWindowMinutes: 60,
} as WelcomeEmailProps;

export default WelcomeEmail;
