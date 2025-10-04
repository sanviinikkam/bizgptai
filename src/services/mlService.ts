import { PredictionResult, AnomalyResult } from '../types';

export interface TimeSeriesData {
  date: string;
  value: number;
}

export const detectAnomalies = (data: Record<string, any>[], metric: string): AnomalyResult[] => {
  const values = data.map((row, index) => ({
    timestamp: row.date || row.timestamp || new Date(Date.now() - (data.length - index) * 86400000).toISOString(),
    value: Number(row[metric]) || 0
  })).filter(v => !isNaN(v.value));

  if (values.length < 3) return [];

  const mean = values.reduce((sum, v) => sum + v.value, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v.value - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const threshold = 2;

  return values.map(point => {
    const zScore = Math.abs((point.value - mean) / stdDev);
    const isAnomaly = zScore > threshold;
    const deviation = ((point.value - mean) / mean) * 100;

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (zScore > 3) severity = 'high';
    else if (zScore > 2.5) severity = 'medium';

    return {
      timestamp: point.timestamp,
      metric,
      value: point.value,
      expected_value: mean,
      deviation: parseFloat(deviation.toFixed(2)),
      is_anomaly: isAnomaly,
      severity
    };
  }).filter(result => result.is_anomaly);
};

export const simpleMovingAverage = (values: number[], window: number): number[] => {
  const sma: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      sma.push(values[i]);
    } else {
      const sum = values.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / window);
    }
  }

  return sma;
};

export const exponentialSmoothing = (values: number[], alpha: number = 0.3): number[] => {
  const smoothed: number[] = [values[0]];

  for (let i = 1; i < values.length; i++) {
    smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
  }

  return smoothed;
};

export const linearRegression = (x: number[], y: number[]): { slope: number; intercept: number } => {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
};

export const predictTimeSeries = (
  data: Record<string, any>[],
  metric: string,
  periods: number = 30
): PredictionResult => {
  const timeSeriesData = data
    .map((row, index) => ({
      date: row.date || row.timestamp || new Date(Date.now() - (data.length - index) * 86400000).toISOString(),
      value: Number(row[metric]) || 0
    }))
    .filter(v => !isNaN(v.value))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (timeSeriesData.length < 2) {
    return {
      metric,
      predictions: [],
      model_type: 'insufficient_data'
    };
  }

  const values = timeSeriesData.map(d => d.value);
  const indices = timeSeriesData.map((_, i) => i);

  const smoothed = exponentialSmoothing(values, 0.3);

  const { slope, intercept } = linearRegression(indices, smoothed);

  const lastDate = new Date(timeSeriesData[timeSeriesData.length - 1].date);
  const predictions = [];

  const residuals = smoothed.map((pred, i) => Math.abs(values[i] - pred));
  const mae = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const confidenceInterval = mae * 1.96;

  for (let i = 1; i <= periods; i++) {
    const futureIndex = timeSeriesData.length + i;
    const predictedValue = slope * futureIndex + intercept;

    const trendAdjustment = slope * i * 0.1;
    const adjustedValue = predictedValue + trendAdjustment;

    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);

    predictions.push({
      date: futureDate.toISOString().split('T')[0],
      value: parseFloat(Math.max(0, adjustedValue).toFixed(2)),
      confidence_lower: parseFloat(Math.max(0, adjustedValue - confidenceInterval).toFixed(2)),
      confidence_upper: parseFloat((adjustedValue + confidenceInterval).toFixed(2))
    });
  }

  const mse = residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - (values.reduce((a, b) => a + b) / values.length), 2), 0) / values.length;
  const r2 = 1 - (mse / variance);

  return {
    metric,
    predictions,
    accuracy_score: parseFloat(Math.max(0, Math.min(1, r2)).toFixed(3)),
    model_type: 'linear_regression_with_exponential_smoothing'
  };
};

export const calculateSeasonality = (values: number[], period: number = 7): number[] => {
  const seasonality: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const seasonIndex = i % period;
    const seasonValues = values.filter((_, idx) => idx % period === seasonIndex);
    const avgSeason = seasonValues.reduce((a, b) => a + b, 0) / seasonValues.length;
    seasonality.push(avgSeason);
  }

  return seasonality;
};

export const detectTrend = (values: number[]): 'up' | 'down' | 'stable' => {
  if (values.length < 2) return 'stable';

  const indices = values.map((_, i) => i);
  const { slope } = linearRegression(indices, values);

  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  const relativeSlopeThreshold = avgValue * 0.01;

  if (slope > relativeSlopeThreshold) return 'up';
  if (slope < -relativeSlopeThreshold) return 'down';
  return 'stable';
};

export const calculateKPIs = (data: Record<string, any>[], columns: string[]): any[] => {
  const kpis = [];

  for (const column of columns) {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v));

    if (values.length === 0) continue;

    const currentValue = values[values.length - 1];
    const previousValue = values.length > 1 ? values[values.length - 2] : currentValue;
    const change = previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
    const trend = detectTrend(values.slice(-10));

    kpis.push({
      id: column,
      name: column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: parseFloat(currentValue.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      trend,
      unit: column.toLowerCase().includes('revenue') || column.toLowerCase().includes('sales') ? '$' : ''
    });
  }

  return kpis;
};

export const generateRecommendations = (
  anomalies: AnomalyResult[],
  predictions: PredictionResult
): string[] => {
  const recommendations: string[] = [];

  const highAnomalies = anomalies.filter(a => a.severity === 'high');
  if (highAnomalies.length > 0) {
    recommendations.push(
      `Critical: ${highAnomalies.length} high-severity anomalies detected. Immediate investigation recommended.`
    );
  }

  if (predictions.predictions.length > 0) {
    const lastPrediction = predictions.predictions[predictions.predictions.length - 1];
    const firstPrediction = predictions.predictions[0];
    const percentChange = ((lastPrediction.value - firstPrediction.value) / firstPrediction.value) * 100;

    if (percentChange > 20) {
      recommendations.push(
        `Opportunity: ${predictions.metric} projected to increase by ${percentChange.toFixed(1)}% over the next period.`
      );
    } else if (percentChange < -20) {
      recommendations.push(
        `Warning: ${predictions.metric} projected to decrease by ${Math.abs(percentChange).toFixed(1)}%. Consider intervention strategies.`
      );
    }
  }

  const mediumAnomalies = anomalies.filter(a => a.severity === 'medium');
  if (mediumAnomalies.length > 2) {
    recommendations.push(
      `Monitor: ${mediumAnomalies.length} moderate anomalies detected. Trend analysis recommended.`
    );
  }

  if (predictions.accuracy_score && predictions.accuracy_score < 0.6) {
    recommendations.push(
      'Note: Prediction accuracy is moderate. Consider collecting more data for improved forecasting.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('All metrics within normal ranges. Continue monitoring key performance indicators.');
  }

  return recommendations;
};
