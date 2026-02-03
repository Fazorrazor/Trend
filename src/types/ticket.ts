export interface TicketData {
  id?: string;
  import_id?: string;
  ticket_id: string;
  request_time: string;
  week_number?: number;
  week_label?: string;
  initiator?: string;
  affiliate?: string;
  cluster?: string;
  service_record_type?: string;
  category?: string;
  sub_category?: string;
  third_lvl_category?: string;
  title?: string;
  description?: string;
  name?: string;
  support_group?: string;
  process?: string;
  process_manager?: string;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  status?: string;
  resolution?: string;
  root_cause?: string;
  incident_origin?: string;
  close_time?: string;
  sla_indicator?: string;
  created_at?: string;
}

export interface DataImport {
  id: string;
  import_name: string;
  imported_by: string;
  imported_at: string;
  total_records: number;
  status: string;
  notes?: string;
  import_month?: number; // 1-12
  import_year?: number; // e.g., 2025
  month_label?: string; // e.g., "January 2025"
}

export interface ClusterAffiliateMapping {
  id: string;
  cluster: string;
  affiliate: string;
  created_at: string;
}

export interface PivotTableData {
  third_lvl_category: string;
  [weekKey: string]: number | string; // Dynamic week columns
}

export interface TrendData {
  period: string;
  count: number;
  category?: string;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

export interface KeyFinding {
  id: string;
  user_id: string;
  service_key: string;
  import_id: string;
  finding_text: string;
  created_at: string;
  updated_at: string;
}
