import { Button, Heading, Section, Text } from "@react-email/components";
import { baseUrl, EmailLayout } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
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
  const previewText = "Your sync ran into an issue";

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>Sync hiccup</Heading>

      <Text style={emailStyles.text}>Hi {userName},</Text>

      <Text style={emailStyles.text}>
        Your latest sync didn&apos;t complete. This is usually temporary—we'll
        automatically retry tomorrow.
      </Text>

      <ContentBox variant="error">
        <Text style={emailStyles.errorText}>{errorMessage}</Text>
      </ContentBox>

      <Text style={emailStyles.text}>
        Want to try again sooner? Hit the sync button on your dashboard.
      </Text>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={`${baseUrl}/dashboard`}>
          Go to Dashboard
        </Button>
      </Section>

      <HelpSection />

      <EmailFooter reason="because of a sync issue in your Splitwise for YNAB account" />
    </EmailLayout>
  );
};

SyncErrorEmail.PreviewProps = {
  userName: "John",
  errorMessage: "Unable to connect to YNAB API. Please try again later.",
} as SyncErrorEmailProps;

export default SyncErrorEmail;
