import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout, baseUrl } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";

export interface TrialEndingEmailProps {
  userName?: string;
  trialEndsAt?: string; // ISO date string
  planName?: string; // "Annual" or "Monthly"
  planPrice?: string; // e.g. "$39/year" or "$4.99/month"
}

export const TrialEndingEmail = ({
  userName = "there",
  trialEndsAt,
  planName = "Annual",
  planPrice = "$39/year",
}: TrialEndingEmailProps) => {
  const previewText = `Your free trial ends in 3 days — here's what happens next`;

  // Format the date nicely
  const formattedDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "in 3 days";

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>Your trial ends soon</Heading>

      <Text style={emailStyles.text}>Hey {userName},</Text>

      <Text style={emailStyles.text}>
        Just a heads up — your {process.env.TRIAL_DAYS || 34}-day free trial
        ends on <strong>{formattedDate}</strong>. After that, your{" "}
        <strong>{planName}</strong> subscription will begin at{" "}
        <strong>{planPrice}</strong>.
      </Text>

      <Section style={highlightBox}>
        <Text style={highlightTitle}>What happens next</Text>
        <Text style={highlightText}>
          • Your card will be charged on {formattedDate}
          <br />
          • Your syncs will continue without interruption
          <br />• You can cancel anytime from your dashboard
        </Text>
      </Section>

      <Text style={emailStyles.text}>
        If you&apos;re loving the automatic expense syncing, you don&apos;t need
        to do anything — we&apos;ll handle the rest.
      </Text>

      <Text style={emailStyles.text}>
        Need to make changes? You can update your plan, payment method, or
        cancel anytime from your{" "}
        <a href={`${baseUrl}/dashboard/settings`} style={emailStyles.link}>
          account settings
        </a>
        .
      </Text>

      <HelpSection />

      <EmailFooter reason="because your free trial is ending soon" />
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

const highlightTitle = {
  ...emailStyles.h3,
  color: colors.amber,
  marginBottom: "12px",
};

const highlightText = {
  ...emailStyles.text,
  color: "#92400e", // amber-800
  margin: 0,
  lineHeight: "1.8",
};

TrialEndingEmail.PreviewProps = {
  userName: "Sarah",
  trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  planName: "Annual",
  planPrice: "$39/year",
} as TrialEndingEmailProps;

export default TrialEndingEmail;
