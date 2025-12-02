

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorizer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- CATEGORIES POLICIES
-- ============================================================================
-- Everyone can view categories (they're global)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  USING (true);

-- Only authenticated users can create custom categories (if needed later)
-- For now, categories are system-wide, so no insert policy needed

-- ============================================================================
-- ACCOUNTS POLICIES
-- ============================================================================
-- Users can view their own accounts
CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own accounts
CREATE POLICY "Users can create own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own accounts
CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own accounts
CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRANSACTIONS POLICIES
-- ============================================================================
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own transactions
CREATE POLICY "Users can create own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own transactions
CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRANSACTION_CATEGORIES POLICIES
-- ============================================================================
-- Users can view transaction categories of their transactions
CREATE POLICY "Users can view own transaction categories"
  ON transaction_categories FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()
    )
  );

-- Users can create transaction categories for their transactions
CREATE POLICY "Users can create own transaction categories"
  ON transaction_categories FOR INSERT
  WITH CHECK (
    transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- STATEMENT_IMPORTS POLICIES
-- ============================================================================
-- Users can view their own imports
CREATE POLICY "Users can view own imports"
  ON statement_imports FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own imports
CREATE POLICY "Users can create own imports"
  ON statement_imports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own imports
CREATE POLICY "Users can update own imports"
  ON statement_imports FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CATEGIZER_FEEDBACK POLICIES
-- ============================================================================
-- Users can view feedback of their transactions
CREATE POLICY "Users can view own feedback"
  ON categorizer_feedback FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()
    )
  );

-- Users can create feedback
CREATE POLICY "Users can create feedback"
  ON categorizer_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- BUDGET_PERIODS POLICIES
-- ============================================================================
-- Users can view their own budgets
CREATE POLICY "Users can view own budgets"
  ON budget_periods FOR SELECT
  USING (auth.uid() = user_id);

-- Users can manage their own budgets
CREATE POLICY "Users can manage own budgets"
  ON budget_periods FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- BUDGET_CATEGORIES POLICIES
-- ============================================================================
-- Users can view budget categories of their budgets
CREATE POLICY "Users can view own budget categories"
  ON budget_categories FOR SELECT
  USING (
    budget_period_id IN (
      SELECT id FROM budget_periods WHERE user_id = auth.uid()
    )
  );

-- Users can manage budget categories of their budgets
CREATE POLICY "Users can manage own budget categories"
  ON budget_categories FOR ALL
  USING (
    budget_period_id IN (
      SELECT id FROM budget_periods WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- INSIGHTS_CACHE POLICIES
-- ============================================================================
-- Users can view their own insights
CREATE POLICY "Users can view own insights"
  ON insights_cache FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create/update their own insights
CREATE POLICY "Users can manage own insights"
  ON insights_cache FOR ALL
  USING (auth.uid() = user_id);

