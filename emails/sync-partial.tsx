import { SyncedItem } from "@/prisma/generated/client";
import { Button, Heading, Section, Text, Hr } from "@react-email/components";
import { baseUrl, EmailLayout } from "./components/email-layout";
import { emailStyles } from "./components/email-styles";
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
  const previewText = "Your recent sync completed with some errors";

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const totalFailures = failedExpenses.length + failedTransactions.length;

  return (
    <EmailLayout previewText={previewText}>
      <Text style={emailStyles.text}>Hi {userName},</Text>

      <Text style={emailStyles.text}>
        Your recent sync completed, but <strong>{totalFailures}</strong>{" "}
        {pluralize(totalFailures, "item")} failed to sync properly.
      </Text>

      {failedExpenses.length > 0 && (
        <Section style={emailStyles.section}>
          <Heading style={emailStyles.h3}>
            Failed: From Splitwise to YNAB
          </Heading>
          <Text style={emailStyles.text}>
            These Splitwise expenses could not be synced to YNAB:
          </Text>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              overflow: "hidden",
              marginTop: "12px",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f9fafb" }}>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: "500",
                      color: "#374151",
                      width: "120px",
                    }}
                  >
                    Amount
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: "500",
                      color: "#374151",
                      width: "100px",
                    }}
                  >
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {failedExpenses.map((expense, index) => (
                  <tr
                    key={expense.id}
                    style={{
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                      borderTop: index > 0 ? "1px solid #e5e7eb" : "none",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div
                        style={{
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {expense.description || "Unknown expense"}
                      </div>
                      {expense.errorMessage && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#dc2626",
                            marginTop: "4px",
                          }}
                        >
                          {expense.errorMessage}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontWeight: "500",
                        color: expense.amount >= 0 ? "#059669" : "#dc2626",
                      }}
                    >
                      {formatCurrency(expense.amount, currencyCode)}
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "2px",
                        }}
                      >
                        {expense.amount < 0 ? "you owe" : "you get back"}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#6b7280" }}>
                      {formatDate(expense.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Text style={emailStyles.text}>
            <strong>How to retry:</strong> Open these expenses in Splitwise and
            make a small edit (like changing the description, amount, or notes).
          </Text>
          <Text style={emailStyles.text}>
            <strong>Manual alternative:</strong> Create these transactions
            manually in YNAB for the amounts shown above.
          </Text>
        </Section>
      )}

      {failedTransactions.length > 0 && (
        <Section style={emailStyles.section}>
          <Heading style={emailStyles.h3}>
            Failed: From YNAB to Splitwise
          </Heading>
          <Text style={emailStyles.text}>
            These YNAB transactions could not be synced to Splitwise:
          </Text>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              overflow: "hidden",
              marginTop: "12px",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f9fafb" }}>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: "500",
                      color: "#374151",
                      width: "120px",
                    }}
                  >
                    Amount
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: "500",
                      color: "#374151",
                      width: "100px",
                    }}
                  >
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {failedTransactions.map((transaction, index) => (
                  <tr
                    key={transaction.id}
                    style={{
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                      borderTop: index > 0 ? "1px solid #e5e7eb" : "none",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div
                        style={{
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {transaction.description || "Unknown transaction"}
                      </div>
                      {transaction.errorMessage && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#dc2626",
                            marginTop: "4px",
                          }}
                        >
                          {transaction.errorMessage}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontWeight: "500",
                        color: transaction.amount >= 0 ? "#059669" : "#dc2626",
                      }}
                    >
                      {formatCurrency(transaction.amount, currencyCode)}
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "2px",
                        }}
                      >
                        {transaction.amount < 0 ? "you paid" : ""}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#6b7280" }}>
                      {formatDate(transaction.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Text style={emailStyles.text}>
            <strong>How to retry:</strong> Open these transactions in YNAB and
            edit the flag back to your sync color.
          </Text>
          <Text style={emailStyles.text}>
            <strong>Manual alternative:</strong> Create these expenses manually
            in Splitwise for the amounts shown above.
          </Text>
        </Section>
      )}

      <Section
        style={{ ...emailStyles.buttonSection, textAlign: "center" as const }}
      >
        <Button style={{ ...emailStyles.button }} href={`${baseUrl}/dashboard`}>
          Go to Dashboard
        </Button>
      </Section>

      <Section style={emailStyles.section}>
        <Heading style={emailStyles.h3}>What Happens Next</Heading>
        <Text style={emailStyles.text}>
          These failed items will <strong>not</strong> be automatically retried.
          You have two options:
        </Text>
        <Text style={{ ...emailStyles.bulletText }}>
          <strong>Option 1:</strong> Follow the retry instructions above, then
          sync again from your dashboard
        </Text>
        <Text style={{ ...emailStyles.bulletText }}>
          <strong>Option 2:</strong> Use the manual alternatives above to create
          the entries directly in the other system
        </Text>
        <Text style={emailStyles.text}>
          Choose whichever approach works better for your workflow.
        </Text>
      </Section>

      <Hr style={emailStyles.hr} />

      <HelpSection message="If you're not sure how to fix these errors, please reach out." />

      <EmailFooter reason="because of a partial sync in your Splitwise for YNAB account" />
    </EmailLayout>
  );
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
      errorMessage:
        "YNAB can't create transaction: date must not be in the future or over 5 years ago (400)",
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
      errorMessage: "Splitwise API rate limit exceeded",
    },
  ],
} as SyncPartialEmailProps;

export default SyncPartialEmail;
