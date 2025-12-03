import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, baseUrl } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
import { EmailFooter } from "./components/email-footer";

export interface PartnerInviteEmailProps {
  partnerName?: string;
  inviterName: string;
  groupName?: string;
  inviteUrl: string;
}

export const PartnerInviteEmail = ({
  partnerName = "there",
  inviterName = "Your partner",
  groupName,
  inviteUrl,
}: PartnerInviteEmailProps) => {
  const previewText = `${inviterName} invited you to sync expenses together`;

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>
        {inviterName} wants to sync expenses with you
      </Heading>

      <Text style={emailStyles.text}>Hi {partnerName},</Text>

      <Text style={emailStyles.text}>
        {inviterName} has set up <strong>Splitwise for YNAB</strong> to
        automatically sync your shared expenses
        {groupName && (
          <>
            {" "}
            from <strong>{groupName}</strong>
          </>
        )}
        . They&apos;ve invited you to connect so expenses flow into your YNAB
        plan too.
      </Text>

      <Section style={highlightBox}>
        <Text style={highlightText}>
          <strong>What you&apos;ll get:</strong> Shared expenses automatically
          appear in your YNAB with the correct categories and amounts—no manual
          entry needed. As part of {inviterName}&apos;s Duo plan, you won&apos;t
          need your own subscription.
        </Text>
      </Section>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={inviteUrl}>
          Accept Invite
        </Button>
      </Section>

      <Text style={emailStyles.textSmall}>
        Setup takes about 5 minutes. This invite expires in 7 days.
      </Text>

      <EmailFooter
        reason={`because ${inviterName} invited you to join their Splitwise for YNAB account`}
      />
    </EmailLayout>
  );
};

const highlightBox = {
  backgroundColor: colors.amberLight,
  border: `1px solid ${colors.amberBorder}`,
  borderRadius: "12px",
  padding: "20px",
  margin: "24px 0",
};

const highlightText = {
  ...emailStyles.text,
  color: "#92400e",
  margin: 0,
};

PartnerInviteEmail.PreviewProps = {
  partnerName: "Alex",
  inviterName: "Jordan",
  groupName: "Household",
  inviteUrl: `${baseUrl}/invite/abc123`,
} as PartnerInviteEmailProps;

export default PartnerInviteEmail;
