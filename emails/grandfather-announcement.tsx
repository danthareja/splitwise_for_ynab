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
    "You've been grandfathered — lifetime free access to Splitwise for YNAB";

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>
        A quick update on Splitwise for YNAB
      </Heading>

      <Text style={emailStyles.text}>Hey {userName},</Text>

      <Text style={emailStyles.text}>
        I wanted to reach out personally because you were one of our early
        users, and I have some news to share.
      </Text>

      <Text style={emailStyles.text}>
        <strong>We&apos;re transitioning to a paid model.</strong> Running this
        service takes time and money — server costs, API fees, and ongoing
        development to keep things running smoothly. To make Splitwise for YNAB
        sustainable for the long term, we need to start charging for it.
      </Text>

      <Section style={highlightBox}>
        <Text style={highlightTitle}>But here&apos;s the thing</Text>
        <Text style={highlightText}>
          You signed up early and helped shape this product.{" "}
          <strong>
            As a thank you, you&apos;ve been grandfathered in with lifetime free
            access.
          </strong>
        </Text>
      </Section>

      <Text style={emailStyles.text}>
        Nothing changes for you. Your expenses will keep syncing automatically,
        just like they always have. No payment required, no action needed on
        your part.
      </Text>

      <Heading style={emailStyles.h3}>Your options going forward</Heading>

      <Text style={emailStyles.text}>
        • <strong>Keep using it free</strong> — You&apos;re all set. Nothing to
        do.
        <br />• <strong>Want to support the project?</strong> — You can
        optionally subscribe to a paid plan if you&apos;d like to help cover
        costs. But again, totally optional.
      </Text>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={`${baseUrl}/dashboard`}>
          Go to Dashboard
        </Button>
      </Section>

      <Text style={emailStyles.text}>
        Thanks for being part of this journey. If you have any questions or just
        want to say hi, reply to this email — I read every message.
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
