import {
  Button,
  Heading,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";
import { EmailLayout, baseUrl } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";
import { pluralize } from "@/lib/utils";

export interface FirstSyncSuccessEmailProps {
  userName?: string;
  expenseCount: number;
  transactionCount: number;
}

export const FirstSyncSuccessEmail = ({
  userName = "there",
  expenseCount = 0,
  transactionCount = 0,
}: FirstSyncSuccessEmailProps) => {
  const totalSynced = expenseCount + transactionCount;
  const previewText = `Your first sync is complete — ${totalSynced} ${pluralize(totalSynced, "item")} synced!`;

  const hasItems = expenseCount > 0 || transactionCount > 0;

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>Your first sync worked! 🎊</Heading>

      <Text style={emailStyles.text}>Hi {userName},</Text>

      <Text style={emailStyles.text}>
        Congrats! Your accounts are officially talking to each other.
        {hasItems && " Here's what just synced:"}
      </Text>

      {hasItems ? (
        <Section style={statsSection}>
          <Row>
            {expenseCount > 0 && (
              <Column
                style={transactionCount > 0 ? statColumnHalf : statColumnFull}
              >
                <div style={statCard}>
                  <span style={statEmoji}>📥</span>
                  <span style={statNumber}>{expenseCount}</span>
                  <span style={statLabel}>
                    {pluralize(expenseCount, "expense")} from Splitwise
                  </span>
                </div>
              </Column>
            )}
            {transactionCount > 0 && (
              <Column
                style={expenseCount > 0 ? statColumnHalf : statColumnFull}
              >
                <div style={statCard}>
                  <span style={statEmoji}>📤</span>
                  <span style={statNumber}>{transactionCount}</span>
                  <span style={statLabel}>
                    {pluralize(transactionCount, "transaction")} from YNAB
                  </span>
                </div>
              </Column>
            )}
          </Row>
        </Section>
      ) : (
        <Section style={successBanner}>
          <Text style={successText}>
            ✓ Accounts connected — ready for your first flagged transaction
          </Text>
        </Section>
      )}

      <Section style={highlightBox}>
        <Text style={highlightText}>
          <strong>You&apos;re all set.</strong> We sync automatically every day
          at 1pm ET. Just keep flagging transactions in YNAB or adding expenses
          in Splitwise—we handle the rest.
        </Text>
      </Section>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={`${baseUrl}/dashboard`}>
          View Your Dashboard
        </Button>
      </Section>

      <HelpSection showHelpLink={false} />

      <EmailFooter reason="because you completed your first sync" />
    </EmailLayout>
  );
};

const statsSection = {
  margin: "24px 0",
};

const statColumnHalf = {
  width: "50%",
  paddingRight: "8px",
};

const statColumnFull = {
  width: "100%",
};

const statCard = {
  backgroundColor: "#ffffff",
  border: `1px solid ${colors.border}`,
  borderRadius: "12px",
  padding: "24px 16px",
  textAlign: "center" as const,
};

const statEmoji = {
  display: "block",
  fontSize: "24px",
  marginBottom: "8px",
};

const statNumber = {
  display: "block",
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "36px",
  fontWeight: "600",
  color: colors.foreground,
  lineHeight: "1",
};

const statLabel = {
  display: "block",
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "13px",
  color: colors.muted,
  marginTop: "6px",
};

const successBanner = {
  backgroundColor: colors.emeraldLight,
  border: `1px solid ${colors.emeraldBorder}`,
  borderRadius: "12px",
  padding: "16px 20px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const successText = {
  ...emailStyles.text,
  color: "#065f46",
  margin: 0,
  fontWeight: "500",
};

const highlightBox = {
  backgroundColor: "#f9fafb",
  border: `1px solid ${colors.border}`,
  borderRadius: "12px",
  padding: "20px",
  margin: "24px 0",
};

const highlightText = {
  ...emailStyles.text,
  color: colors.muted,
  margin: 0,
};

FirstSyncSuccessEmail.PreviewProps = {
  userName: "John",
  expenseCount: 3,
  transactionCount: 2,
} as FirstSyncSuccessEmailProps;

export default FirstSyncSuccessEmail;
