import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { emailStyles } from "./components/email-styles";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";

export interface FirstSyncSuccessEmailProps {
  userName?: string;
  syncedCount?: number;
}

export const FirstSyncSuccessEmail = ({
  userName = "there",
  syncedCount = 1,
}: FirstSyncSuccessEmailProps) => {
  const transactionWord = syncedCount === 1 ? "expense" : "expenses";
  const previewText = `It's working — ${syncedCount} ${transactionWord} synced automatically`;

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>
        It&apos;s working — {syncedCount} {transactionWord} synced automatically
      </Heading>

      <Text style={emailStyles.text}>
        Hey {userName}, your first sync just ran. That&apos;s {syncedCount}{" "}
        {transactionWord} you didn&apos;t have to copy between Splitwise and
        YNAB by hand.
      </Text>

      <Text style={emailStyles.text}>
        From here, your accounts sync automatically every day. You don&apos;t
        need to do anything — just keep using YNAB and Splitwise like normal.
      </Text>

      <HelpSection />

      <EmailFooter reason="because your first sync just completed on Splitwise for YNAB" />
    </EmailLayout>
  );
};

FirstSyncSuccessEmail.PreviewProps = {
  userName: "John",
  syncedCount: 5,
} as FirstSyncSuccessEmailProps;

export default FirstSyncSuccessEmail;
