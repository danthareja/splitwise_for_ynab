import { Button, Heading, Section, Text } from "@react-email/components";
import { baseUrl, EmailLayout } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
import { ContentBox } from "./components/content-box";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";

export interface PartnerDisconnectedEmailProps {
  userName?: string;
  primaryName: string;
  oldGroupName?: string;
}

export const PartnerDisconnectedEmail = ({
  userName = "there",
  primaryName,
  oldGroupName,
}: PartnerDisconnectedEmailProps) => {
  const previewText = "Your Duo account has been disconnected";

  return (
    <EmailLayout previewText={previewText}>
      <Section style={noticeBanner}>
        <Text style={noticeText}>Account change</Text>
      </Section>

      <Heading style={emailStyles.h1}>
        You&apos;ve been disconnected from your Duo account
      </Heading>

      <Text style={emailStyles.text}>Hi {userName},</Text>

      <Text style={emailStyles.text}>
        {primaryName} changed their Splitwise group
        {oldGroupName ? ` from "${oldGroupName}"` : ""} to a group that
        you&apos;re not a member of.
      </Text>

      <Text style={emailStyles.text}>
        As a result, you&apos;ve been converted to a Solo account and your sync
        has been paused.
      </Text>

      <ContentBox variant="info">
        <Heading style={emailStyles.h3}>What you need to do</Heading>
        <Text style={actionItem}>
          <strong>1.</strong> Sign in to your dashboard
        </Text>
        <Text style={actionItem}>
          <strong>2.</strong> Select a new Splitwise group to sync
        </Text>
        <Text style={actionItem}>
          <strong>3.</strong> Your sync will resume automatically
        </Text>
      </ContentBox>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button
          style={emailStyles.button}
          href={`${baseUrl}/dashboard/settings`}
        >
          Go to Settings
        </Button>
      </Section>

      <Text style={emailStyles.textSmall}>
        If you&apos;d like to rejoin {primaryName}&apos;s Duo account, ask them
        to send you a new invite after they add you to their Splitwise group.
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
} as PartnerDisconnectedEmailProps;

export default PartnerDisconnectedEmail;
