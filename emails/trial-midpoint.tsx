import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, baseUrl } from "./components/email-layout";
import { emailStyles } from "./components/email-styles";
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
    ? `${transactionCount} transactions you didn't have to enter by hand`
    : `You're halfway through your free trial`;

  return (
    <EmailLayout previewText={previewText}>
      {hasUsage ? (
        <>
          <Heading style={emailStyles.h1}>
            {transactionCount} transactions you didn&apos;t have to enter by
            hand
          </Heading>

          <Text style={emailStyles.text}>
            Hey {userName}, that&apos;s {transactionCount}{" "}
            {transactionCount === 1 ? "transaction" : "transactions"} that
            showed up in YNAB automatically — no copying amounts, no switching
            between apps, no forgetting one and wondering why your budget&apos;s
            off.
          </Text>

          <Text style={emailStyles.text}>
            You&apos;re halfway through your free trial with {daysLeft} days
            left. Your syncs will keep running automatically — when your trial
            ends, your subscription begins. Nothing to do on your end.
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

          <Section
            style={{
              ...emailStyles.buttonSection,
              textAlign: "center" as const,
            }}
          >
            <Button style={emailStyles.button} href={`${baseUrl}/dashboard`}>
              Go to Dashboard
            </Button>
          </Section>
        </>
      )}

      <HelpSection />

      <EmailFooter
        reason="because you're on a free trial of Splitwise for YNAB"
        unsubscribeUrl={unsubscribeUrl}
      />
    </EmailLayout>
  );
};

TrialMidpointEmail.PreviewProps = {
  userName: "Sarah",
  daysLeft: 17,
  syncCount: 12,
  transactionCount: 47,
  unsubscribeUrl: "https://splitwiseforynab.com/api/unsubscribe?token=example",
} as TrialMidpointEmailProps;

export default TrialMidpointEmail;
