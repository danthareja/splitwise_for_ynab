import { SyncedItem } from "@/prisma/generated/client";
import { Button, Heading, Section, Text, Hr } from "@react-email/components";
import { baseUrl, EmailLayout } from "./components/email-layout";
import { emailStyles, colors } from "./components/email-styles";
import { HelpSection } from "./components/help-section";
import { EmailFooter } from "./components/email-footer";
import { pluralize } from "@/lib/utils";

export interface SyncPartialEmailProps {
  userName?: string;
  failedExpenses: SyncedItem[];
  failedTransactions: SyncedItem[];
  currencyCode?: string;
}

export const SyncPartialEmail = ({
  userName = "there",
  failedExpenses,
  failedTransactions,
  currencyCode = "USD",
}: SyncPartialEmailProps) => {
  const previewText = "Some items didn't sync";

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const totalFailures = failedExpenses.length + failedTransactions.length;

  return (
    <EmailLayout previewText={previewText}>
      <Heading style={emailStyles.h1}>Partial sync complete</Heading>

      <Text style={emailStyles.text}>Hi {userName},</Text>

      <Text style={emailStyles.text}>
        Your sync finished, but {totalFailures}{" "}
        {pluralize(totalFailures, "item")} couldn&apos;t be processed. Here's
        what happened:
      </Text>

      {failedExpenses.length > 0 && (
        <Section style={emailStyles.section}>
          <Heading style={emailStyles.h3}>
            Splitwise → YNAB ({failedExpenses.length} failed)
          </Heading>

          <div style={tableContainer}>
            <table style={emailStyles.table}>
              <thead>
                <tr>
                  <th style={emailStyles.tableHeader}>Item</th>
                  <th style={{ ...emailStyles.tableHeader, width: "80px" }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {failedExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td style={emailStyles.tableCell}>
                      <div style={itemName}>
                        {expense.description || "Unknown expense"}
                      </div>
                      {expense.errorMessage && (
                        <div style={errorDetail}>{expense.errorMessage}</div>
                      )}
                    </td>
                    <td style={{ ...emailStyles.tableCell, ...amountCell }}>
                      {formatCurrency(expense.amount, currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Text style={emailStyles.textSmall}>
            <strong>To retry:</strong> Edit the expense in Splitwise (change
            description or amount) and sync again.
          </Text>
        </Section>
      )}

      {failedTransactions.length > 0 && (
        <Section style={emailStyles.section}>
          <Heading style={emailStyles.h3}>
            YNAB → Splitwise ({failedTransactions.length} failed)
          </Heading>

          <div style={tableContainer}>
            <table style={emailStyles.table}>
              <thead>
                <tr>
                  <th style={emailStyles.tableHeader}>Item</th>
                  <th style={{ ...emailStyles.tableHeader, width: "80px" }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {failedTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td style={emailStyles.tableCell}>
                      <div style={itemName}>
                        {transaction.description || "Unknown transaction"}
                      </div>
                      {transaction.errorMessage && (
                        <div style={errorDetail}>
                          {transaction.errorMessage}
                        </div>
                      )}
                    </td>
                    <td style={{ ...emailStyles.tableCell, ...amountCell }}>
                      {formatCurrency(transaction.amount, currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Text style={emailStyles.textSmall}>
            <strong>To retry:</strong> Re-flag the transaction in YNAB and sync
            again.
          </Text>
        </Section>
      )}

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={emailStyles.button} href={`${baseUrl}/dashboard`}>
          Go to Dashboard
        </Button>
      </Section>

      <HelpSection />

      <EmailFooter reason="because some items failed to sync" />
    </EmailLayout>
  );
};

const tableContainer = {
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
  overflow: "hidden",
  margin: "12px 0",
};

const itemName = {
  fontWeight: "500",
  color: colors.foreground,
};

const errorDetail = {
  fontSize: "12px",
  color: colors.red,
  marginTop: "4px",
};

const amountCell = {
  fontWeight: "500",
  color: colors.foreground,
  textAlign: "right" as const,
};

SyncPartialEmail.PreviewProps = {
  userName: "John",
  currencyCode: "USD",
  failedExpenses: [
    {
      id: "synced-item-1",
      externalId: "123",
      type: "splitwise_expense",
      amount: -45.0,
      description: "Dinner at Italian Restaurant",
      date: "2024-01-17",
      syncHistoryId: "sync-history-1",
      direction: "splitwise_to_ynab",
      status: "error",
      errorMessage: "Date must not be over 5 years ago",
    },
  ],
  failedTransactions: [
    {
      id: "synced-item-2",
      externalId: "456",
      type: "ynab_transaction",
      amount: -32.5,
      description: "Uber to Airport",
      date: "2024-01-18",
      syncHistoryId: "sync-history-1",
      direction: "ynab_to_splitwise",
      status: "error",
      errorMessage: "API rate limit exceeded",
    },
  ],
} as SyncPartialEmailProps;

export default SyncPartialEmail;
