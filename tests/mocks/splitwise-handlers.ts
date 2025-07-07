import { http, HttpResponse } from "msw";
import {
  mockSplitwiseExpenses,
  mockSplitwiseMembers,
  mockSplitwiseExpenseResponse,
} from "../factories/test-data";

const SPLITWISE_BASE_URL = "https://secure.splitwise.com/api/v3.0";

export const splitwiseHandlers = [
  // Splitwise API handlers
  http.get(`${SPLITWISE_BASE_URL}/get_expenses`, ({ request }) => {
    const url = new URL(request.url);
    const groupId = url.searchParams.get("group_id");
    const updatedAfter = url.searchParams.get("updated_after");

    // Filter expenses based on query parameters
    let expenses = mockSplitwiseExpenses;

    if (groupId) {
      expenses = expenses.filter(
        (expense) => expense.group_id.toString() === groupId,
      );
    }

    if (updatedAfter) {
      expenses = expenses.filter(
        (expense) => new Date(expense.updated_at) > new Date(updatedAfter),
      );
    }

    return HttpResponse.json({ expenses });
  }),

  http.post(`${SPLITWISE_BASE_URL}/create_expense`, async () => {
    return HttpResponse.json(mockSplitwiseExpenseResponse);
  }),

  http.get(`${SPLITWISE_BASE_URL}/get_group/:groupId`, ({ params }) => {
    const { groupId } = params;
    return HttpResponse.json({
      group: {
        id: parseInt(groupId as string),
        name: "Test Group",
        members: mockSplitwiseMembers,
      },
    });
  }),

  http.post(`${SPLITWISE_BASE_URL}/update_expense/:expenseId`, ({ params }) => {
    const { expenseId } = params;
    return HttpResponse.json({
      expense: {
        ...mockSplitwiseExpenses[0],
        id: parseInt(expenseId as string),
      },
    });
  }),
];
