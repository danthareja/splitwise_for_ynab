import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, baseUrl } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";

export interface FirstSyncSuccessEmailProps {
  userName?: string;
  syncedCount?: number;
}

export const FirstSyncSuccessEmail = ({
  userName = "there",
  syncedCount = 1,
}: FirstSyncSuccessEmailProps) => {
  const previewText = `Your first sync just ran — ${syncedCount} ${syncedCount === 1 ? "transaction" : "transactions"} synced!`;
  const transactionWord = syncedCount === 1 ? "transaction" : "transactions";

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>Your first sync just ran!</Heading>

      <Text style={emailStyles.text}>
        Hey {userName}, your accounts are connected and working. We just synced{" "}
        {syncedCount} {transactionWord} between YNAB and Splitwise.
      </Text>

      <Section style={highlightBox}>
        <Text style={highlightText}>
          Your accounts sync automatically every day at 1pm ET. You can also
          trigger a manual sync from your dashboard.
        </Text>
      </Section>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={`${baseUrl}/dashboard`}>
          Go to Dashboard
        </Button>
      </Section>

      <HelpSection />

      <EmailFooter reason="because your first sync just completed on Splitwise for YNAB" />
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

FirstSyncSuccessEmail.PreviewProps = {
  userName: "John",
  syncedCount: 5,
} as FirstSyncSuccessEmailProps;

export default FirstSyncSuccessEmail;
