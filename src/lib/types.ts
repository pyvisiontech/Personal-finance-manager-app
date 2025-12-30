// TypeScript types for Personal Finance Tracker

export type CurrencyType = 'USD' | 'INR' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CNY' | 'SGD' | 'AED';

export type TransactionType = 'expense' | 'income' | 'transfer';
export type TransactionSource = 'manual' | 'statement' | 'bank_link' | 'invoice';
export type TransactionStatus = 'pending' | 'final';

export type CategoryType = 'expense' | 'income';

export type StatementSourceType = 'bank_statement' | 'invoice';
export type StatementStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export type BudgetPeriodType = 'monthly' | 'weekly' | 'yearly' | 'custom';

// Database Types
export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  currency: CurrencyType;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: CategoryType;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  institution: string | null;
  account_type: string;
  account_number: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string | null;
  user_id: string;
  source: TransactionSource;
  amount: number;
  currency: CurrencyType;
  type: TransactionType;
  raw_description: string | null;
  merchant: string | null;
  status: TransactionStatus;
  category_ai_id: string | null;
  category_user_id: string | null;
  statement_import_id: string | null; // Direct link to statement file (file_id)
  occurred_at: string;
  created_at: string;
}

export interface TransactionWithCategory extends Transaction {
  category?: Category;
  category_user?: Category;
  category_ai?: Category;
}

export interface StatementImport {
  id: string;
  user_id: string;
  file_url: string;
  source_type: StatementSourceType;
  status: StatementStatus;
  processor_job_id: string | null;
  processed_at: string | null;
  error: string | null;
  created_at: string;
}

export interface StatementTransaction {
  id: string;
  statement_import_id: string;
  transaction_id: string;
  created_at: string;
}

export interface BudgetPeriod {
  id: string;
  user_id: string;
  type: BudgetPeriodType;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface BudgetCategory {
  id: string;
  budget_period_id: string;
  category_id: string;
  planned_amount: number;
  created_at: string;
}

// Chart/Display Types
export interface CategoryExpense {
  category_id: string;
  category_name: string;
  category_icon: string | null;
  total_amount: number;
  transaction_count: number;
}

export interface ExpenseOverview {
  total_expense: number;
  total_income: number;
  categories: CategoryExpense[];
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface UploadStatementResponse {
  import_id: string;
  status: StatementStatus;
  message: string;
}

// Family Groups Types
export interface FamilyGroup {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  user?: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface GroupInvite {
  id: string;
  group_id: string;
  invited_by: string;
  invite_token: string;
  invitee_email: string;
  invitee_name: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
  group?: FamilyGroup;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'group_invite' | 'group_joined' | 'transaction_added' | 'other';
  title: string;
  message: string;
  data: {
    group_id?: string;
    invite_id?: string;
    invite_token?: string;
    [key: string]: any;
  } | null;
  status: 'unread' | 'read' | 'dismissed';
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
}

