import { Button, Heading, Section, Text, Hr } from "@react-email/components";
import { baseUrl, EmailLayout } from "./components/email-layout";
import { emailStyles } from "./components/email-styles";
import { ContentBox } from "./components/content-box";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";

export interface SyncErrorEmailProps {
  userName?: string;
  errorMessage: string;
}

export const SyncErrorEmail = ({
  userName = "there",
  errorMessage,
}: SyncErrorEmailProps) => {
  const previewText = "Your recent sync failed";

  return (
    <EmailLayout previewText={previewText}>
      <Text style={emailStyles.text}>Hi {userName},</Text>

      <Text style={emailStyles.text}>
        A recent attempt to sync your Splitwise for YNAB account failed.
      </Text>

      <ContentBox variant="error">
        <Text style={emailStyles.errorText}>{errorMessage}</Text>
      </ContentBox>

      <Section style={emailStyles.section}>
        <Heading style={emailStyles.h3}>What We&apos;re Doing</Heading>
        <Text style={emailStyles.text}>
          This error is usually temporary. We&apos;ll automatically retry the
          sync operation tomorrow during our scheduled window.
        </Text>
        <Text style={{ ...emailStyles.text }}>
          If you want to try again sooner, you can manually sync from your
          dashboard.
        </Text>
      </Section>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={{ ...emailStyles.button }} href={`${baseUrl}/dashboard`}>
          Go to Dashboard
        </Button>
      </Section>

      <Hr style={emailStyles.hr} />

      <HelpSection message="If this problem persists, please reach out." />

      <EmailFooter reason="because of a sync error in your Splitwise for YNAB account" />
    </EmailLayout>
  );
};

SyncErrorEmail.PreviewProps = {
  userName: "John",
  errorMessage: "Unable to connect to YNAB API. Please try again later.",
  suggestedFix:
    "This is usually a temporary issue. Try syncing again in a few minutes.",
} as SyncErrorEmailProps;

export default SyncErrorEmail;
