export interface SplitwiseUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  registration_status?: string;
  picture: {
    small: string;
    medium: string;
    large: string;
  };
  custom_picture?: boolean;
}

export interface SplitwiseDebt {
  from: number;
  to: number;
  amount: string;
  currency_code?: string;
}

export interface SplitwiseBalance {
  user_id: number;
  amount: string;
  currency_code: string;
}

export interface SplitwiseGroupReminders {
  enabled: boolean;
  frequency: string;
}

export interface SplitwiseMember {
  user_id: number;
  first_name: string;
  last_name: string;
  picture: {
    medium: string;
  };
  email: string;
  registration_status: string;
  balance: SplitwiseBalance[];
}

export interface SplitwiseGroup {
  id: number;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
  members: SplitwiseMember[];
  simplify_by_default: boolean;
  original_debts: SplitwiseDebt[];
  simplified_debts: SplitwiseDebt[];
  whiteboard: string | null;
  group_type: string | null;
  invite_link: string | null;
  group_reminders: SplitwiseGroupReminders | null;
  avatar: {
    small: string;
    medium: string;
    large: string;
    original: string;
  };
  custom_avatar: boolean;
  cover_photo: {
    xxlarge: string;
    xlarge: string;
  };
}

export interface SplitwiseCategory {
  id: number;
  name: string;
}

export interface SplitwiseReceipt {
  large: string;
  original: string;
}

export interface SplitwiseExpenseUser {
  user: object;
  user_id: number;
  paid_share: string;
  owed_share: string;
  net_balance: string;
}

export interface SplitwiseComment {
  id: number;
  content: string;
  comment_type: string;
  relation_type: string;
  relation_id: number;
  created_at: string;
  deleted_at: string;
  user: object;
}

export interface SplitwiseExpense {
  cost: string;
  description: string;
  details?: string;
  date: string;
  repeat_interval: string;
  currency_code: string;
  category_id: number;
  id: number;
  group_id: number;
  friendship_id: number;
  expense_bundle_id: number;
  repeats: boolean;
  email_reminder: boolean;
  email_reminder_in_advance: string | null;
  next_repeat: string;
  comments_count: number;
  payment: boolean;
  transaction_confirmed: boolean;
  repayments: SplitwiseDebt[];
  created_at: string;
  created_by: SplitwiseUser;
  updated_at: string;
  updated_by: SplitwiseUser;
  deleted_at?: string | null;
  deleted_by?: SplitwiseUser;
  category: SplitwiseCategory;
  receipt: SplitwiseReceipt;
  users: SplitwiseExpenseUser[];
  comments: SplitwiseComment[];
}
