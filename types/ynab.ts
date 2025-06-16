export type YNABTransactionClearedStatus =
  | "cleared"
  | "uncleared"
  | "reconciled";

export type YNABTransactionFlagColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple";

export type YNABSubTransaction = {
  id: string;
  transaction_id: string;
  amount: number; // in milliunits format
  memo?: string | null;
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  transfer_account_id?: string | null;
  transfer_transaction_id?: string | null;
  deleted: boolean;
};

export type YNABTransaction = {
  id: string;
  date: string; // ISO format (e.g. 2016-12-01)
  amount: number; // in milliunits format
  memo?: string | null;
  cleared: YNABTransactionClearedStatus;
  approved: boolean;
  flag_color?: YNABTransactionFlagColor | null;
  flag_name?: string | null;
  account_id: string;
  payee_id?: string | null;
  category_id?: string | null;
  transfer_account_id?: string | null;
  transfer_transaction_id?: string | null;
  matched_transaction_id?: string | null;
  import_id?: string | null;
  import_payee_name?: string | null;
  import_payee_name_original?: string | null;
  debt_transaction_type?: string | null;
  deleted: boolean;
  account_name: string;
  payee_name?: string | null;
  category_name?: string | null;
  subtransactions: YNABSubTransaction[];
};

export type YNABErrorDetail = {
  id: string;
  name: string;
  detail: string;
};

export type YNABErrorResponse = {
  error: YNABErrorDetail;
};

export type YNABBudget = {
  id: string;
  name: string;
  last_modified_on: string;
  first_month: string;
  last_month: string;
  currency_format: {
    iso_code: string;
    example_format: string;
    decimal_digits: number;
    decimal_separator: string;
    symbol_first: boolean;
    group_separator: string;
    currency_symbol: string;
    display_symbol: boolean;
  };
};

export type YNABAccount = {
  id: string;
  name: string;
  type: string;
  on_budget: boolean;
  closed: boolean;
  note: string | null;
  balance: number;
  cleared_balance: number;
  uncleared_balance: number;
  transfer_payee_id: string;
  direct_import_linked: boolean;
  direct_import_in_error: boolean;
  deleted: boolean;
};

export type YNABFlagColor = {
  id: string;
  name: string;
  color: string;
};
