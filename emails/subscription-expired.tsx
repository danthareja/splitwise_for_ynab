import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, baseUrl } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";

export interface SubscriptionExpiredEmailProps {
  userName?: string;
  expiredAt?: string; // ISO date string
  isSecondary?: boolean; // True if this is a secondary user on a duo plan
}

export const SubscriptionExpiredEmail = ({
  userName = "there",
  expiredAt,
  isSecondary = false,
}: SubscriptionExpiredEmailProps) => {
  const previewText = "Your expenses stopped syncing";

  // Format the date nicely
  const formattedDate = expiredAt
    ? new Date(expiredAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "recently";

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>Your expenses stopped syncing</Heading>

      <Text style={emailStyles.text}>Hey {userName},</Text>

      {isSecondary ? (
        <Text style={emailStyles.text}>
          Your partner&apos;s Splitwise for YNAB subscription ended on{" "}
          <strong>{formattedDate}</strong>. Since you were on their Duo plan,
          your access has also ended.
        </Text>
      ) : (
        <Text style={emailStyles.text}>
          Your Splitwise for YNAB subscription ended on{" "}
          <strong>{formattedDate}</strong>.
        </Text>
      )}

      <Section style={warningBox}>
        <Text style={warningTitle}>What this means</Text>
        <Text style={warningText}>
          • Your expenses will no longer sync automatically
          <br />
          • Your settings and sync history are still saved
          <br />• You can re-subscribe anytime to resume syncing
        </Text>
      </Section>

      {isSecondary ? (
        <Text style={emailStyles.text}>
          If you&apos;d like to continue using Splitwise for YNAB, you can ask
          your partner to re-subscribe, or set up your own account.
        </Text>
      ) : (
        <Text style={emailStyles.text}>
          Whenever you&apos;re ready, re-subscribe and your next sync runs
          automatically. All your settings are still saved.
        </Text>
      )}

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button
          style={emailStyles.button}
          href={`${baseUrl}/dashboard/settings`}
        >
          {isSecondary ? "View Account" : "Re-subscribe"}
        </Button>
      </Section>

      <HelpSection />

      <EmailFooter reason="because your Splitwise for YNAB subscription has ended" />
    </EmailLayout>
  );
};

const warningBox = {
  backgroundColor: colors.amberLight,
  border: `1px solid ${colors.amberBorder}`,
  borderRadius: "12px",
  padding: "20px",
  margin: "24px 0",
};

const warningTitle = {
  ...emailStyles.h3,
  color: colors.amber,
  marginBottom: "12px",
};

const warningText = {
  ...emailStyles.text,
  color: "#92400e", // amber-800
  margin: 0,
  lineHeight: "1.8",
};

SubscriptionExpiredEmail.PreviewProps = {
  userName: "Sarah",
  expiredAt: new Date().toISOString(),
  isSecondary: false,
} as SubscriptionExpiredEmailProps;

export default SubscriptionExpiredEmail;
