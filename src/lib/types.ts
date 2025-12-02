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
  occurred_at: string;
  created_at: string;
}

export interface TransactionWithCategory extends Transaction {
  category?: Category;
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

export interface CategorizerFeedback {
  id: string;
  transaction_id: string;
  old_category: string | null;
  new_category: string;
  reason: string | null;
  user_id: string;
  source: 'user_override' | 'analyst_review';
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

export interface InsightsCache {
  id: string;
  user_id: string;
  period_start: string | null;
  period_end: string | null;
  insights: Record<string, any>;
  generated_at: string;
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

