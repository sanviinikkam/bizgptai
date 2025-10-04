export interface User {
  id: string;
  email: string;
  role: 'admin' | 'sales' | 'marketing' | 'product' | 'analyst';
  name: string;
  created_at: string;
}

export interface Dataset {
  id: string;
  name: string;
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
  row_count: number;
  column_count: number;
  columns: DataColumn[];
  status: 'processing' | 'ready' | 'error';
  preview_data?: Record<string, any>[];
}

export interface DataColumn {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  unique_count?: number;
}

export interface Query {
  id: string;
  user_id: string;
  dataset_id: string;
  natural_language_query: string;
  generated_sql?: string;
  results?: any[];
  created_at: string;
  execution_time_ms?: number;
}

export interface Insight {
  id: string;
  type: 'prediction' | 'anomaly' | 'recommendation' | 'summary';
  dataset_id: string;
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  data: any;
  created_at: string;
}

export interface KPI {
  id: string;
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit?: string;
  icon: string;
}

export interface Alert {
  id: string;
  type: 'anomaly' | 'threshold' | 'prediction';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
  read: boolean;
}

export interface PredictionResult {
  metric: string;
  predictions: Array<{
    date: string;
    value: number;
    confidence_lower: number;
    confidence_upper: number;
  }>;
  accuracy_score?: number;
  model_type: string;
}

export interface AnomalyResult {
  timestamp: string;
  metric: string;
  value: number;
  expected_value: number;
  deviation: number;
  is_anomaly: boolean;
  severity: 'low' | 'medium' | 'high';
}
