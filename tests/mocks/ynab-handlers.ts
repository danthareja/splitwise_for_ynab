import { http, HttpResponse } from "msw";
import {
  mockYnabTransactionResponse,
  mockYnabTransactions,
} from "../factories/test-data";

const YNAB_BASE_URL = "https://api.youneedabudget.com/v1";

export const ynabHandlers = [
  // YNAB API handlers
  http.get(`${YNAB_BASE_URL}/budgets/:budgetId/transactions`, ({ request }) => {
    const url = new URL(request.url);
    const sinceDate = url.searchParams.get("since_date");
    const accountId = url.searchParams.get("account_id");

    // Filter transactions based on query parameters
    let transactions = mockYnabTransactions;

    if (accountId) {
      transactions = transactions.filter((txn) => txn.account_id === accountId);
    }

    if (sinceDate) {
      transactions = transactions.filter(
        (txn) => new Date(txn.date) > new Date(sinceDate),
      );
    }

    return HttpResponse.json({
      data: {
        transactions,
        server_knowledge: "12345",
      },
    });
  }),

  http.post(`${YNAB_BASE_URL}/budgets/:budgetId/transactions`, async () => {
    return HttpResponse.json(mockYnabTransactionResponse);
  }),

  http.patch(
    `${YNAB_BASE_URL}/budgets/:budgetId/transactions/:transactionId`,
    async ({ params }) => {
      const { transactionId } = params;

      return HttpResponse.json({
        data: {
          transaction: {
            ...mockYnabTransactions[0],
            id: transactionId,
          },
        },
      });
    },
  ),

  http.put(
    `${YNAB_BASE_URL}/budgets/:budgetId/transactions/:transactionId`,
    async ({ params }) => {
      const { transactionId } = params;

      return HttpResponse.json({
        data: {
          transaction: {
            ...mockYnabTransactions[0],
            id: transactionId,
          },
        },
      });
    },
  ),
];
