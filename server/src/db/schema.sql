-- ============================================================================
-- AUTOMATED PROBLEM MANAGEMENT TRACKER - POSTGRESQL SCHEMA
-- ============================================================================
-- Database Type: PostgreSQL
-- Created: 2026-02-03
-- Description: Consolidated schema for PostgreSQL
-- ============================================================================

-- ============================================================================
-- DATA IMPORTS TABLE
-- ============================================================================
-- Tracks history of data imports
CREATE TABLE IF NOT EXISTS data_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_name TEXT NOT NULL,
  imported_by UUID,
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_records INTEGER NOT NULL,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  import_month INTEGER CHECK (import_month >= 1 AND import_month <= 12),
  import_year INTEGER CHECK (import_year >= 2000 AND import_year <= 2100),
  month_label TEXT
);

CREATE INDEX IF NOT EXISTS idx_data_imports_month_year ON data_imports(import_year, import_month);

-- ============================================================================
-- CLUSTER AND AFFILIATE MAPPING TABLE
-- ============================================================================
-- Maps clusters to their affiliates
CREATE TABLE IF NOT EXISTS cluster_affiliate_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster TEXT NOT NULL,
  affiliate TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cluster, affiliate)
);

-- Users can add their own cluster-affiliate mappings through the UI

-- ============================================================================
-- TICKET DATA TABLE
-- ============================================================================
-- Main table for storing imported ticket data
CREATE TABLE IF NOT EXISTS ticket_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES data_imports(id) ON DELETE CASCADE,
  
  -- Core ticket fields
  ticket_id TEXT NOT NULL,
  request_time TIMESTAMP NOT NULL,
  week_number INTEGER,
  week_label TEXT,
  
  -- Organization fields
  initiator TEXT,
  affiliate TEXT,
  cluster TEXT,
  
  -- Service categorization
  service TEXT,
  category TEXT,
  sub_category TEXT,
  third_lvl_category TEXT,
  
  -- Ticket details
  title TEXT,
  description TEXT,
  name TEXT,
  support_group TEXT,
  process TEXT,
  
  -- Status and resolution
  priority TEXT CHECK (priority IN ('P1', 'P2', 'P3', 'P4') OR priority IS NULL),
  status TEXT,
  resolution TEXT,
  root_cause TEXT,
  incident_origin TEXT,
  close_time TIMESTAMP,
  sla_indicator TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_ticket_data_import_id ON ticket_data(import_id);
CREATE INDEX IF NOT EXISTS idx_ticket_data_request_time ON ticket_data(request_time);
CREATE INDEX IF NOT EXISTS idx_ticket_data_week_number ON ticket_data(week_number);
CREATE INDEX IF NOT EXISTS idx_ticket_data_category ON ticket_data(category);
CREATE INDEX IF NOT EXISTS idx_ticket_data_sub_category ON ticket_data(sub_category);
CREATE INDEX IF NOT EXISTS idx_ticket_data_third_lvl_category ON ticket_data(third_lvl_category);
CREATE INDEX IF NOT EXISTS idx_ticket_data_service ON ticket_data(service);
CREATE INDEX IF NOT EXISTS idx_ticket_data_affiliate ON ticket_data(affiliate);
CREATE INDEX IF NOT EXISTS idx_ticket_data_cluster ON ticket_data(cluster);
CREATE INDEX IF NOT EXISTS idx_ticket_data_priority ON ticket_data(priority);
CREATE INDEX IF NOT EXISTS idx_ticket_data_status ON ticket_data(status);
CREATE INDEX IF NOT EXISTS idx_ticket_data_ticket_id ON ticket_data(ticket_id);

-- ============================================================================
-- USER PROFILES TABLE
-- ============================================================================
-- Stores user profile information and preferences
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Personal Information
  full_name TEXT,
  display_name TEXT,
  job_title TEXT,
  department TEXT,
  phone_number TEXT,
  avatar_url TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  
  -- Preferences
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  
  -- Notification Settings
  email_notifications BOOLEAN DEFAULT TRUE,
  import_notifications BOOLEAN DEFAULT TRUE,
  weekly_digest BOOLEAN DEFAULT FALSE,
  
  -- Dashboard Preferences
  default_view TEXT DEFAULT 'trends' CHECK (default_view IN ('import', 'trends', 'pivot', 'history', 'settings')),
  items_per_page INTEGER DEFAULT 25,
  show_tutorial BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  login_count INTEGER DEFAULT 0,
  
  -- Bio and Notes
  bio TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================================================
-- USER ACTIVITY LOG TABLE
-- ============================================================================
-- Tracks user activities and actions
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_description TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);

-- ============================================================================
-- USER PREFERENCES HISTORY TABLE
-- ============================================================================
-- Tracks changes to user preferences over time
CREATE TABLE IF NOT EXISTS user_preferences_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_history_user_id ON user_preferences_history(user_id);

-- ============================================================================
-- KEY FINDINGS TABLE
-- ============================================================================
-- Stores user-customizable insights
CREATE TABLE IF NOT EXISTS key_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  service_key TEXT NOT NULL,
  import_id TEXT NOT NULL DEFAULT 'all',
  finding_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_key_findings_service ON key_findings(service_key, import_id);
CREATE INDEX IF NOT EXISTS idx_key_findings_user ON key_findings(user_id);

-- ============================================================================
-- DETAILED ANALYSIS TABLE
-- ============================================================================
-- Stores user-editable detailed analysis (root cause & recommendations)
CREATE TABLE IF NOT EXISTS detailed_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  service_key TEXT NOT NULL,
  category TEXT NOT NULL,
  import_id TEXT NOT NULL DEFAULT 'all',
  root_cause TEXT,
  recommendation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(user_id, service_key, category, import_id)
);

CREATE INDEX IF NOT EXISTS idx_detailed_analysis_user ON detailed_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_detailed_analysis_service_category ON detailed_analysis(service_key, category, import_id);
CREATE INDEX IF NOT EXISTS idx_detailed_analysis_created ON detailed_analysis(created_at);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for key_findings
DROP TRIGGER IF EXISTS update_key_findings_updated_at ON key_findings;
CREATE TRIGGER update_key_findings_updated_at BEFORE UPDATE ON key_findings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for detailed_analysis
DROP TRIGGER IF EXISTS update_detailed_analysis_updated_at ON detailed_analysis;
CREATE TRIGGER update_detailed_analysis_updated_at BEFORE UPDATE ON detailed_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
