import { Button, Heading, Section, Text } from "@react-email/components";
import { baseUrl, EmailLayout } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
import { ContentBox } from "./components/content-box";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";
import { TRIAL_DAYS } from "@/lib/stripe-pricing";

export interface PartnerDisconnectedEmailProps {
  userName?: string;
  primaryName: string;
  oldGroupName?: string;
  /** Reason for disconnection: 'group_change' (default) or 'mode_change' (primary switched to solo) */
  reason?: "group_change" | "mode_change";
}

export const PartnerDisconnectedEmail = ({
  userName = "there",
  primaryName,
  oldGroupName,
  reason = "group_change",
}: PartnerDisconnectedEmailProps) => {
  const previewText = "You've been removed from your partner's Duo plan";

  const reasonText =
    reason === "mode_change"
      ? `${primaryName} has switched to Solo mode.`
      : `${primaryName} changed their Splitwise group${oldGroupName ? ` from "${oldGroupName}"` : ""} to one that you're not a member of.`;

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>
        You&apos;ve been removed from {primaryName}&apos;s Duo plan
      </Heading>

      <Text style={emailStyles.text}>Hi {userName},</Text>

      <Text style={emailStyles.text}>{reasonText}</Text>

      <Text style={emailStyles.text}>
        As a result, you&apos;ll need to set up your own Splitwise for YNAB
        account to continue syncing.
      </Text>

      <ContentBox variant="highlight">
        <Heading style={emailStyles.h3}>What you need to do</Heading>
        <Text style={actionItem}>
          <strong>1.</strong> Sign in to your account
        </Text>
        <Text style={actionItem}>
          <strong>2.</strong> Select a new Splitwise group to sync
        </Text>
        <Text style={actionItem}>
          <strong>3.</strong> Start your free {TRIAL_DAYS}-day trial
        </Text>
        <Text style={actionItem}>
          <strong>4.</strong> Your sync will resume automatically
        </Text>
      </ContentBox>

      <Text style={emailStyles.textSmall}>
        Don&apos;t worry — your existing transaction history and YNAB
        configuration will be preserved. You just need to pick a new Splitwise
        group and start your own subscription.
      </Text>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={`${baseUrl}/dashboard/setup`}>
          Set Up My Account
        </Button>
      </Section>

      <Text style={emailStyles.textSmall}>
        Want to rejoin {primaryName}&apos;s plan? Ask them to send you a new
        invite — you won&apos;t need your own subscription if you&apos;re on
        their Duo plan.
      </Text>

      <HelpSection />

      <EmailFooter reason="because your Duo account settings changed" />
    </EmailLayout>
  );
};

const noticeBanner = {
  backgroundColor: colors.amberLight,
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

const noticeText = {
  ...emailStyles.text,
  color: colors.amber,
  fontWeight: "600",
  margin: 0,
  fontSize: "14px",
};

const actionItem = {
  ...emailStyles.text,
  margin: "8px 0",
};

PartnerDisconnectedEmail.PreviewProps = {
  userName: "Sarah",
  primaryName: "John",
  oldGroupName: "Household Expenses",
  reason: "group_change",
} as PartnerDisconnectedEmailProps;

export default PartnerDisconnectedEmail;
