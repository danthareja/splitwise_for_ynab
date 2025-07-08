import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, baseUrl } from "./components/email-layout";
import { emailStyles } from "./components/email-styles";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";

export interface WelcomeEmailProps {
  userName?: string;
}

export const WelcomeEmail = ({ userName = "there" }: WelcomeEmailProps) => {
  const previewText = `Welcome to Splitwise for YNAB! Your complete setup guide`;

  return (
    <EmailLayout previewText={previewText}>
      <Text style={emailStyles.text}>Hi {userName},</Text>

      <Text style={emailStyles.text}>
        Thank you for connecting your Splitwise account! You&apos;re almost
        ready to start syncing your shared expenses with YNAB.
      </Text>

      <Section style={emailStyles.section}>
        <Heading style={emailStyles.h2}>Complete Your Setup</Heading>

        <Text style={emailStyles.text}>
          To start automating your shared expenses, you&apos;ll need to
          configure both your YNAB and Splitwise connections. Here&apos;s
          exactly what to do:
        </Text>

        <Text style={emailStyles.text}>
          <strong>Step 1: Configure Your YNAB Connection</strong>
          <br />
          • Select which YNAB budget to use for syncing
          <br />
          • Choose or create a &quot;Splitwise&quot; account in YNAB (this
          tracks your balance)
          <br />
          • Set your manual flag color (you&apos;ll use this to mark
          transactions for syncing)
          <br />• Set your synced flag color (we&apos;ll change flags to this
          after processing)
        </Text>

        <Text style={emailStyles.text}>
          <strong>Step 2: Configure Your Splitwise Connection</strong>
          <br />
          • Select which Splitwise group to sync with
          <br />
          • Set your currency (we&apos;ll match your group&apos;s currency)
          <br />
          • Choose your sync emoji (default: ✅) - this marks expenses you
          create
          <br />
          • Set your default split ratio (usually 1:1 for equal splits)
          <br />• Choose how transaction payee names appear in YNAB
        </Text>

        <Text style={emailStyles.text}>
          <strong>Step 3: Start Syncing!</strong>
          <br />
          Once configured, you can flag transactions in YNAB or create expenses
          in Splitwise, and we&apos;ll sync them automatically.
        </Text>
      </Section>

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={`${baseUrl}/dashboard`}>
          Complete Setup Now
        </Button>
      </Section>

      <Section style={emailStyles.section}>
        <Heading style={emailStyles.h2}>How It Works</Heading>

        <Text style={emailStyles.text}>
          Our system creates a <strong>Splitwise cash account</strong> in YNAB
          to track your balance. Here&apos;s how the magic happens:
        </Text>

        <Text style={emailStyles.text}>
          <strong>YNAB → Splitwise Sync:</strong>
          <br />
          • Flag any transaction in YNAB with your chosen color
          <br />
          • We&apos;ll create a matching expense in your Splitwise group
          <br />
          • An adjustment transaction flows back to your Splitwise account
          <br />• Your YNAB categories show only your share of the expense
        </Text>

        <Text style={emailStyles.text}>
          <strong>Splitwise → YNAB Sync:</strong>
          <br />
          • When expenses are added to your Splitwise group
          <br />
          • We&apos;ll import your share as transactions in YNAB
          <br />
          • They&apos;ll be categorized and balanced against your Splitwise
          account
          <br />
        </Text>

        <Text style={emailStyles.text}>
          <strong>The Balance System:</strong>
          <br />• <strong>Positive balance:</strong> Your partner owes you money
          <br />• <strong>Negative balance:</strong> You owe money to your
          partner
          <br />• <strong>Settlement:</strong> Transfer money between accounts
          when you settle up
        </Text>
      </Section>

      <Section style={emailStyles.section}>
        <Heading style={emailStyles.h2}>Sync Timing</Heading>

        <Text style={emailStyles.text}>
          We automatically sync your data once daily at{" "}
          <strong>1:00 PM Eastern (10:00 AM Pacific)</strong>. This catches any
          new expenses or transactions from both apps.
        </Text>

        <Text style={emailStyles.text}>
          Need to sync right away? Use the <strong>&quot;Sync Now&quot;</strong>{" "}
          button on your dashboard. You can manually sync up to{" "}
          <strong>2 times every 120 minutes</strong>.
        </Text>
      </Section>

      <Section style={emailStyles.section}>
        <Heading style={emailStyles.h2}>Pro Tips</Heading>
        <Text style={emailStyles.text}>
          • <strong>Start Small:</strong> Try flagging one transaction after
          setup to see how it works <br />• <strong>Custom Splits:</strong> For
          one-off expenses that don&apos;t fit your default split ratio, add the
          expense directly in Splitwise with your preferred ratio <br />•{" "}
          <strong>Reimbursements:</strong> When you pay for something entirely
          for your partner, create a Splitwise expense where you&apos;re owed
          the full amount <br />• <strong>Watch Your Balance:</strong> The
          dollars in your Splitwise account aren&apos;t spendable until you
          settle up <br />
        </Text>
      </Section>

      <HelpSection message="Questions about setup? We're here to help you get the most out of automated expense sharing!" />

      <EmailFooter reason="because you signed up for Splitwise for YNAB and recently connected your Splitwise account" />
    </EmailLayout>
  );
};

WelcomeEmail.PreviewProps = {
  userName: "John",
} as WelcomeEmailProps;

export default WelcomeEmail;
