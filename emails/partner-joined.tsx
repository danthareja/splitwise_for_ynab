import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, baseUrl } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
import { EmailFooter } from "./components/email-footer";

export interface PartnerJoinedEmailProps {
  userName?: string;
  partnerName: string;
}

export const PartnerJoinedEmail = ({
  userName = "there",
  partnerName,
}: PartnerJoinedEmailProps) => {
  const previewText = `${partnerName} joined your Splitwise for YNAB account`;

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>{partnerName} is in! 🎉</Heading>

      <Text style={emailStyles.text}>Hi {userName},</Text>

      <Text style={emailStyles.text}>
        Great news—<strong>{partnerName}</strong> just finished setting up their
        account. Your shared expenses will now sync to both of your YNAB plans
        automatically.
      </Text>

      <Section style={highlightBox}>
        <Text style={highlightText}>
          <strong>You&apos;re fully connected.</strong> When either of you flags
          a transaction or adds an expense to Splitwise, it&apos;ll show up in
          both your YNAB budgets with the correct split.
        </Text>
      </Section>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={`${baseUrl}/dashboard`}>
          View Dashboard
        </Button>
      </Section>

      <EmailFooter reason="because your partner completed their Splitwise for YNAB setup" />
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

PartnerJoinedEmail.PreviewProps = {
  userName: "Jordan",
  partnerName: "Alex",
} as PartnerJoinedEmailProps;

export default PartnerJoinedEmail;
