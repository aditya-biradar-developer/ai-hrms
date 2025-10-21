-- ============================================================================
-- COMPREHENSIVE PAYROLL SYSTEM - Database Schema
-- Enterprise-grade payroll management with salary components, taxes, and compliance
-- ============================================================================

-- Step 1: Update existing payroll table with comprehensive fields
ALTER TABLE payroll
  -- Basic Info (keep existing)
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS month INTEGER CHECK (month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS year INTEGER CHECK (year >= 2020),
  ADD COLUMN IF NOT EXISTS pay_period_start DATE,
  ADD COLUMN IF NOT EXISTS pay_period_end DATE,
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'bank_transfer',
  
  -- Salary Components (Earnings)
  ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hra DECIMAL(12, 2) DEFAULT 0, -- House Rent Allowance
  ADD COLUMN IF NOT EXISTS transport_allowance DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS medical_allowance DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS special_allowance DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_pay DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incentives DECIMAL(12, 2) DEFAULT 0,
  
  -- Deductions
  ADD COLUMN IF NOT EXISTS tax_deduction DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provident_fund DECIMAL(12, 2) DEFAULT 0, -- PF
  ADD COLUMN IF NOT EXISTS professional_tax DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loan_repayment DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_deduction DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_deductions DECIMAL(12, 2) DEFAULT 0,
  
  -- Attendance & Leave
  ADD COLUMN IF NOT EXISTS working_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS present_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS absent_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_leaves INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unpaid_leaves INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(5, 2) DEFAULT 0,
  
  -- Calculated Fields
  ADD COLUMN IF NOT EXISTS gross_salary DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_deductions DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_salary DECIMAL(12, 2) DEFAULT 0,
  
  -- Status & Notes
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'paid', 'cancelled')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

-- Make old salary column nullable if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payroll' AND column_name = 'salary'
    ) THEN
        ALTER TABLE payroll ALTER COLUMN salary DROP NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payroll' AND column_name = 'deductions'
    ) THEN
        ALTER TABLE payroll ALTER COLUMN deductions DROP NOT NULL;
    END IF;
END $$;

-- Step 2: Create salary structure table (template for each employee)
CREATE TABLE IF NOT EXISTS salary_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  -- Salary Components
  basic_salary DECIMAL(12, 2) NOT NULL,
  hra DECIMAL(12, 2) DEFAULT 0,
  transport_allowance DECIMAL(12, 2) DEFAULT 0,
  medical_allowance DECIMAL(12, 2) DEFAULT 0,
  special_allowance DECIMAL(12, 2) DEFAULT 0,
  
  -- Standard Deductions
  provident_fund_percent DECIMAL(5, 2) DEFAULT 12.00, -- % of basic
  professional_tax DECIMAL(12, 2) DEFAULT 0,
  insurance DECIMAL(12, 2) DEFAULT 0,
  
  -- CTC (Cost to Company)
  annual_ctc DECIMAL(12, 2),
  monthly_ctc DECIMAL(12, 2),
  
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, effective_from)
);

-- Step 3: Create payroll adjustments table (for one-time additions/deductions)
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id UUID REFERENCES payroll(id) ON DELETE CASCADE,
  type VARCHAR(50) CHECK (type IN ('addition', 'deduction')),
  category VARCHAR(100) NOT NULL, -- e.g., 'Bonus', 'Penalty', 'Reimbursement'
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Create payroll history/audit table
CREATE TABLE IF NOT EXISTS payroll_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id UUID REFERENCES payroll(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'processed', 'paid', 'cancelled'
  changed_by UUID REFERENCES users(id),
  changes JSONB, -- Store what changed
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_user_month_year ON payroll(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);
CREATE INDEX IF NOT EXISTS idx_payroll_payment_date ON payroll(payment_date);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(pay_period_start, pay_period_end);

CREATE INDEX IF NOT EXISTS idx_salary_structure_user ON salary_structure(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_structure_active ON salary_structure(is_active);
CREATE INDEX IF NOT EXISTS idx_salary_structure_effective ON salary_structure(effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_payroll ON payroll_adjustments(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_history_payroll ON payroll_history(payroll_id);

-- Step 6: Create views for easy querying
CREATE OR REPLACE VIEW payroll_summary AS
SELECT 
  p.id,
  p.user_id,
  u.name as employee_name,
  u.email as employee_email,
  u.department,
  p.month,
  p.year,
  p.gross_salary,
  p.total_deductions,
  p.net_salary,
  p.status,
  p.payment_date,
  p.created_at
FROM payroll p
LEFT JOIN users u ON p.user_id = u.id;

-- Step 7: Add helpful comments
COMMENT ON TABLE payroll IS 'Monthly payroll records with detailed salary breakdown';
COMMENT ON TABLE salary_structure IS 'Employee salary structure templates';
COMMENT ON TABLE payroll_adjustments IS 'One-time additions or deductions to payroll';
COMMENT ON TABLE payroll_history IS 'Audit trail for payroll changes';

COMMENT ON COLUMN payroll.basic_salary IS 'Base salary component';
COMMENT ON COLUMN payroll.hra IS 'House Rent Allowance';
COMMENT ON COLUMN payroll.gross_salary IS 'Total earnings before deductions';
COMMENT ON COLUMN payroll.net_salary IS 'Take-home salary after all deductions';
COMMENT ON COLUMN payroll.status IS 'Payroll processing status';

-- Step 8: Create function to calculate payroll
CREATE OR REPLACE FUNCTION calculate_payroll_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate gross salary (sum of all earnings)
  NEW.gross_salary := COALESCE(NEW.basic_salary, 0) +
                      COALESCE(NEW.hra, 0) +
                      COALESCE(NEW.transport_allowance, 0) +
                      COALESCE(NEW.medical_allowance, 0) +
                      COALESCE(NEW.special_allowance, 0) +
                      COALESCE(NEW.overtime_pay, 0) +
                      COALESCE(NEW.bonus, 0) +
                      COALESCE(NEW.commission, 0) +
                      COALESCE(NEW.incentives, 0);
  
  -- Calculate total deductions
  NEW.total_deductions := COALESCE(NEW.tax_deduction, 0) +
                          COALESCE(NEW.provident_fund, 0) +
                          COALESCE(NEW.professional_tax, 0) +
                          COALESCE(NEW.insurance, 0) +
                          COALESCE(NEW.loan_repayment, 0) +
                          COALESCE(NEW.advance_deduction, 0) +
                          COALESCE(NEW.other_deductions, 0);
  
  -- Calculate net salary
  NEW.net_salary := NEW.gross_salary - NEW.total_deductions;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate totals
DROP TRIGGER IF EXISTS trigger_calculate_payroll ON payroll;
CREATE TRIGGER trigger_calculate_payroll
  BEFORE INSERT OR UPDATE ON payroll
  FOR EACH ROW
  EXECUTE FUNCTION calculate_payroll_totals();

-- Step 9: Insert sample salary structures (optional - for testing)
-- You can uncomment and modify these for your actual employees

/*
INSERT INTO salary_structure (user_id, effective_from, basic_salary, hra, transport_allowance, medical_allowance, annual_ctc, monthly_ctc)
VALUES 
  ('your-user-id-here', '2025-01-01', 50000, 20000, 3000, 2000, 900000, 75000);
*/

-- Step 10: Verify setup
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('payroll', 'salary_structure', 'payroll_adjustments', 'payroll_history')
ORDER BY table_name, ordinal_position;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Comprehensive Payroll System setup complete!';
    RAISE NOTICE '📊 Tables created: payroll, salary_structure, payroll_adjustments, payroll_history';
    RAISE NOTICE '🔧 Triggers and functions created for auto-calculation';
    RAISE NOTICE '🔍 Indexes created for optimal performance';
    RAISE NOTICE '📝 Ready to process payroll!';
END $$;
