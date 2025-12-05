import { Button, Heading, Section, Text, Link } from "@react-email/components";
import { EmailLayout, baseUrl } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";

export interface GrandfatherAnnouncementEmailProps {
  userName?: string;
}

export const GrandfatherAnnouncementEmail = ({
  userName = "there",
}: GrandfatherAnnouncementEmailProps) => {
  const previewText =
    "You're an early supporter — lifetime free access to Splitwise for YNAB";

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>
        Splitwise for YNAB is getting an upgrade
      </Heading>

      <Text style={emailStyles.text}>Hey {userName},</Text>

      <Text style={emailStyles.text}>
        Things might look and feel a bit different around here. We&apos;ve been
        rebuilding Splitwise for YNAB from the ground up — faster syncing,
        easier account setup, and a smoother experience overall. We&apos;re
        excited about what&apos;s coming next.
      </Text>

      <Text style={emailStyles.text}>
        As part of this upgrade, we&apos;re also transitioning to a paid model
        to keep things sustainable.
      </Text>

      <Section style={highlightBox}>
        <Text style={highlightTitle}>You&apos;re in for free — forever</Text>
        <Text style={highlightText}>
          You signed up early and helped shape this product.{" "}
          <strong>
            As a thank you, you&apos;re getting lifetime free access as an early
            supporter.
          </strong>{" "}
          No payment required, no action needed.
        </Text>
      </Section>

      <Text style={emailStyles.text}>
        Your expenses will keep syncing automatically, just like they always
        have. If you ever want to support the project, you can optionally
        subscribe — but it&apos;s completely up to you.
      </Text>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={`${baseUrl}/dashboard`}>
          Go to Dashboard
        </Button>
      </Section>

      <Text style={emailStyles.text}>
        Thanks for being part of this journey. If you have any questions, just
        reply to this email. I read every message I get.
      </Text>

      <Text style={emailStyles.text}>
        Cheers,
        <br />
        Dan
      </Text>

      <HelpSection />

      <EmailFooter reason="because you're a Splitwise for YNAB user" />
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

const highlightTitle = {
  ...emailStyles.h3,
  color: colors.emerald,
  marginBottom: "8px",
};

const highlightText = {
  ...emailStyles.text,
  color: "#065f46", // emerald-800
  margin: 0,
};

GrandfatherAnnouncementEmail.PreviewProps = {
  userName: "Sarah",
} as GrandfatherAnnouncementEmailProps;

export default GrandfatherAnnouncementEmail;
