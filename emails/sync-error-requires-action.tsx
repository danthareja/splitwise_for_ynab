import { Button, Heading, Section, Text } from "@react-email/components";
import { baseUrl, EmailLayout } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
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
  const previewText = "Action needed: Your sync has been paused";

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>Your sync is paused</Heading>

      <Text style={emailStyles.text}>Hi {userName},</Text>

      <Text style={emailStyles.text}>
        We&apos;ve temporarily paused syncing because of an issue that needs
        your attention.
      </Text>

      <ContentBox variant="error">
        <Text style={emailStyles.errorText}>{errorMessage}</Text>
      </ContentBox>

      <Section style={emailStyles.section}>
        <Heading style={emailStyles.h3}>How to fix this</Heading>
        <Text style={emailStyles.text}>
          <strong>1.</strong> {suggestedFix}
        </Text>
        <Text style={emailStyles.text}>
          <strong>2.</strong> Visit your dashboard and click "Re-enable Sync"
        </Text>
      </Section>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={`${baseUrl}/dashboard`}>
          Go to Dashboard
        </Button>
      </Section>

      <Text style={emailStyles.textSmall}>
        Syncing will remain paused until you re-enable it.
      </Text>

      <HelpSection />

      <EmailFooter reason="because of a sync issue requiring your attention" />
    </EmailLayout>
  );
};

const urgentBanner = {
  backgroundColor: colors.amberLight,
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

const urgentText = {
  ...emailStyles.text,
  color: colors.amber,
  fontWeight: "600",
  margin: 0,
  fontSize: "14px",
};

SyncErrorRequiresActionEmail.PreviewProps = {
  userName: "John",
  errorMessage: "YNAB subscription has lapsed. (403.1)",
  suggestedFix: "Renew your YNAB subscription to continue syncing.",
} as SyncErrorRequiresActionEmailProps;

export default SyncErrorRequiresActionEmail;
