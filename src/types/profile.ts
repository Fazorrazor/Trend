export interface UserProfile {
  id: string;
  full_name?: string;
  display_name?: string;
  job_title?: string;
  department?: string;
  phone_number?: string;
  avatar_url?: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  date_format: string;
  email_notifications: boolean;
  import_notifications: boolean;
  weekly_digest: boolean;
  default_view: 'import' | 'trends' | 'pivot' | 'history' | 'settings';
  items_per_page: number;
  show_tutorial: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  login_count: number;
  bio?: string;
  notes?: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  activity_description?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface UserPreferenceHistory {
  id: string;
  user_id: string;
  preference_key: string;
  old_value?: string;
  new_value?: string;
  changed_at: string;
}

export interface ProfileUpdateData {
  full_name?: string;
  display_name?: string;
  job_title?: string;
  department?: string;
  phone_number?: string;
  avatar_url?: string;
  bio?: string;
  notes?: string;
}

export interface PreferencesUpdateData {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
  date_format?: string;
  email_notifications?: boolean;
  import_notifications?: boolean;
  weekly_digest?: boolean;
  default_view?: 'import' | 'trends' | 'pivot' | 'history' | 'settings';
  items_per_page?: number;
  show_tutorial?: boolean;
}
