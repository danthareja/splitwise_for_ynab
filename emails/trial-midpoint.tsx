import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, baseUrl } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";

export interface TrialMidpointEmailProps {
  userName?: string;
  daysLeft?: number;
  syncCount?: number;
  transactionCount?: number;
  unsubscribeUrl?: string;
}

export const TrialMidpointEmail = ({
  userName = "there",
  daysLeft = 17,
  syncCount = 0,
  transactionCount = 0,
  unsubscribeUrl,
}: TrialMidpointEmailProps) => {
  const hasUsage = transactionCount > 0;
  const previewText = hasUsage
    ? `You've synced ${transactionCount} transactions so far`
    : `You're halfway through your free trial`;

  return (
    <EmailLayout previewText={previewText}>
      {hasUsage ? (
        <>
          <Heading style={emailStyles.h1}>
            You&apos;ve synced {transactionCount} transactions so far
          </Heading>

          <Text style={emailStyles.text}>
            Hey {userName}, you&apos;re halfway through your free trial with{" "}
            {daysLeft} days left.
          </Text>

          <Section style={statsBox}>
            <Text style={statsText}>
              <strong>{syncCount}</strong> {syncCount === 1 ? "sync" : "syncs"}{" "}
              completed
            </Text>
            <Text style={{ ...statsText, margin: 0 }}>
              <strong>{transactionCount}</strong>{" "}
              {transactionCount === 1 ? "transaction" : "transactions"} synced
            </Text>
          </Section>

          <Text style={emailStyles.text}>
            Your syncs will continue automatically. When your trial ends, your
            subscription begins.
          </Text>
        </>
      ) : (
        <>
          <Heading style={emailStyles.h1}>
            You&apos;re halfway through your free trial
          </Heading>

          <Text style={emailStyles.text}>
            Hey {userName}, you have {daysLeft} days left in your free trial but
            haven&apos;t synced yet.
          </Text>

          <Text style={emailStyles.text}>
            Flag a transaction in YNAB or add a Splitwise expense, then hit sync
            from your dashboard to try it out.
          </Text>
        </>
      )}

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={`${baseUrl}/dashboard`}>
          Go to Dashboard
        </Button>
      </Section>

      <HelpSection />

      <EmailFooter
        reason="because you're on a free trial of Splitwise for YNAB"
        unsubscribeUrl={unsubscribeUrl}
      />
    </EmailLayout>
  );
};

const statsBox = {
  backgroundColor: colors.emeraldLight,
  border: `1px solid ${colors.emeraldBorder}`,
  borderRadius: "12px",
  padding: "20px",
  margin: "24px 0",
};

const statsText = {
  ...emailStyles.text,
  color: "#065f46",
  margin: "0 0 8px 0",
};

TrialMidpointEmail.PreviewProps = {
  userName: "Sarah",
  daysLeft: 17,
  syncCount: 12,
  transactionCount: 47,
  unsubscribeUrl: "https://splitwiseforynab.com/api/unsubscribe?token=example",
} as TrialMidpointEmailProps;

export default TrialMidpointEmail;
