import { Button, Heading, Section, Text, Hr } from "@react-email/components";
import { baseUrl, EmailLayout } from "./components/email-layout";
import { emailStyles } from "./components/email-styles";
import { ContentBox } from "./components/content-box";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";

export interface SyncErrorRequiresActionEmailProps {
  userName?: string;
  errorMessage: string;
  suggestedFix: string;
}

export const SyncErrorRequiresActionEmail = ({
  userName = "there",
  errorMessage,
  suggestedFix,
}: SyncErrorRequiresActionEmailProps) => {
  const previewText =
    "[ACTION REQUIRED] Your Splitwise for YNAB account has temporarily been disabled";

  return (
    <EmailLayout previewText={previewText}>
      <Text style={emailStyles.text}>Hi {userName},</Text>

      <Text style={emailStyles.text}>
        Your Splitwise for YNAB account has temporarily been disabled due to a
        recent sync error that requires your attention.
      </Text>

      <ContentBox variant="error">
        <Text style={emailStyles.errorText}>{errorMessage}</Text>
      </ContentBox>

      <Section style={emailStyles.section}>
        <Heading style={emailStyles.h3}>How to Re-enable Syncing</Heading>
        <Text style={{ ...emailStyles.bulletText }}>1. {suggestedFix}</Text>
        <Text style={{ ...emailStyles.bulletText }}>
          2. Visit your dashboard, where you&apos;ll see a notification
        </Text>
        <Text style={{ ...emailStyles.bulletText }}>
          3. Click &quot;Re-enable Sync&quot; once you&apos;ve fixed the issue
        </Text>
      </Section>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={{ ...emailStyles.button }} href={`${baseUrl}/dashboard`}>
          Go to Dashboard
        </Button>
      </Section>

      <Text style={{ ...emailStyles.text }}>
        <strong>Note:</strong> No further syncing will occur until you manually
        re-enable your account.
      </Text>

      <Hr style={emailStyles.hr} />

      <HelpSection message="If you're having trouble resolving this issue, we're here to help!" />

      <EmailFooter reason="because of a sync error in your Splitwise for YNAB account" />
    </EmailLayout>
  );
};

SyncErrorRequiresActionEmail.PreviewProps = {
  userName: "John",
  errorMessage:
    "YNAB can't get transactions: The subscription for this account has lapsed. (403.1)",
  suggestedFix:
    "Your YNAB subscription has lapsed. Please renew your YNAB subscription to continue syncing.",
} as SyncErrorRequiresActionEmailProps;

export default SyncErrorRequiresActionEmail;
