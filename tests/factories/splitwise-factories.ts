import type { SplitwiseExpense, SplitwiseMember } from "@/types/splitwise";

// Mock data generators for Splitwise (for HTTP responses)
export function createMockSplitwiseExpense(overrides = {}) {
  return {
    id: Math.floor(Math.random() * 100000),
    group_id: "test-group-123",
    description: "Test expense",
    cost: "25.50",
    currency_code: "USD",
    date: "2024-01-15T00:00:00Z",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    deleted_at: null,
    category: {
      id: 1,
      name: "General",
    },
    details: "Test expense details",
    payment: false,
    creation_method: "manual",
    transaction_method: "none",
    transaction_id: null,
    repeats: "never",
    email_reminder: false,
    email_reminder_in_advance: -1,
    next_repeat: null,
    comments_count: 0,
    repayments: [],
    users: [
      {
        user_id: 12345,
        paid_share: "25.50",
        owed_share: "12.75",
        net_balance: "12.75",
      },
    ],
    ...overrides,
  };
}

export function createMockSplitwiseMember(overrides = {}) {
  return {
    id: 12345,
    first_name: "Test",
    last_name: "User",
    email: "test@example.com",
    registration_status: "confirmed",
    picture: {
      medium: "https://example.com/avatar.jpg",
    },
    custom_picture: false,
    notifications_read: "2024-01-15T10:30:00Z",
    notifications_count: 0,
    notifications: {
      added_as_friend: true,
      added_to_group: true,
      expense_added: true,
      expense_updated: true,
      bills: true,
      payments: true,
      monthly_summary: true,
      major_updates: true,
    },
    default_currency: "USD",
    locale: "en",
    date_format: "MM/DD/YYYY",
    default_group_id: -1,
    force_refresh_at: null,
    ...overrides,
  };
}

// Mock API responses for Splitwise
export const mockSplitwiseExpenses: SplitwiseExpense[] = [
  {
    id: 1,
    group_id: 123,
    friendship_id: 0,
    expense_bundle_id: 0,
    description: "Test Expense 1",
    details: "Test expense details",
    payment: false,
    cost: "25.50",
    currency_code: "USD",
    date: "2024-01-15T10:00:00Z",
    repeat_interval: "never",
    category_id: 1,
    repeats: false,
    email_reminder: false,
    email_reminder_in_advance: null,
    next_repeat: "never",
    comments_count: 0,
    transaction_confirmed: false,
    created_at: "2024-01-15T10:00:00Z",
    created_by: {
      id: 111,
      first_name: "User",
      last_name: "One",
      email: "user1@example.com",
      picture: {
        small: "https://example.com/pic1_small.jpg",
        medium: "https://example.com/pic1_medium.jpg",
        large: "https://example.com/pic1_large.jpg",
      },
    },
    updated_at: "2024-01-15T10:00:00Z",
    updated_by: {
      id: 111,
      first_name: "User",
      last_name: "One",
      email: "user1@example.com",
      picture: {
        small: "https://example.com/pic1_small.jpg",
        medium: "https://example.com/pic1_medium.jpg",
        large: "https://example.com/pic1_large.jpg",
      },
    },
    deleted_at: null,
    category: {
      id: 1,
      name: "General",
    },
    receipt: {
      large: "",
      original: "",
    },
    users: [
      {
        user: {},
        user_id: 111,
        paid_share: "25.50",
        owed_share: "12.75",
        net_balance: "12.75",
      },
      {
        user: {},
        user_id: 222,
        paid_share: "0.00",
        owed_share: "12.75",
        net_balance: "-12.75",
      },
    ],
    repayments: [
      {
        from: 222,
        to: 111,
        amount: "12.75",
      },
    ],
    comments: [],
  },
];

export const mockSplitwiseMembers: SplitwiseMember[] = [
  {
    id: 111,
    first_name: "User",
    last_name: "One",
    email: "user1@example.com",
    registration_status: "confirmed",
    custom_picture: false,
    balance: [],
    picture: {
      small: "https://example.com/pic1_small.jpg",
      medium: "https://example.com/pic1_medium.jpg",
      large: "https://example.com/pic1_large.jpg",
    },
  },
  {
    id: 222,
    first_name: "User",
    last_name: "Two",
    email: "user2@example.com",
    registration_status: "confirmed",
    custom_picture: false,
    balance: [],
    picture: {
      small: "https://example.com/pic2_small.jpg",
      medium: "https://example.com/pic2_medium.jpg",
      large: "https://example.com/pic2_large.jpg",
    },
  },
];

export const mockSplitwiseExpenseResponse = {
  expenses: [
    {
      id: 2,
      group_id: 123,
      description: "Test Payee",
      details: "Test transaction memo",
      cost: "25.50",
      currency_code: "USD",
      date: "2024-01-15",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
      users: [
        {
          user_id: 111,
          paid_share: "25.50",
          owed_share: "12.75",
          net_balance: "12.75",
        },
        {
          user_id: 222,
          paid_share: "0.00",
          owed_share: "12.75",
          net_balance: "-12.75",
        },
      ],
      repayments: [
        {
          from: 222,
          to: 111,
          amount: "12.75",
        },
      ],
    },
  ],
};
