import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  ShoppingCart,
  AlertTriangle,
  Sparkles,
  Target,
  Activity
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { KPICard, LineChart } from './Charts';
import { calculateKPIs, predictTimeSeries, detectAnomalies, generateRecommendations } from '../services/mlService';
import { KPI, PredictionResult, AnomalyResult } from '../types';

export const Dashboard: React.FC = () => {
  const { currentDataset, addInsight, addAlert } = useData();
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [predictions, setPredictions] = useState<PredictionResult | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (currentDataset) {
      analyzeData();
    }
  }, [currentDataset]);

  const analyzeData = async () => {
    if (!currentDataset) return;

    setIsAnalyzing(true);

    try {
      const datasetRows = JSON.parse(localStorage.getItem(`dataset_${currentDataset.id}`) || '[]');

      const numericColumns = currentDataset.columns
        .filter(col => col.type === 'number')
        .map(col => col.name);

      if (numericColumns.length > 0) {
        const calculatedKPIs = calculateKPIs(datasetRows, numericColumns);
        setKpis(calculatedKPIs);

        const primaryMetric = numericColumns[0];
        const predictionResult = predictTimeSeries(datasetRows, primaryMetric, 30);
        setPredictions(predictionResult);

        const detectedAnomalies = detectAnomalies(datasetRows, primaryMetric);
        setAnomalies(detectedAnomalies);

        const recs = generateRecommendations(detectedAnomalies, predictionResult);
        setRecommendations(recs);

        detectedAnomalies.forEach((anomaly, index) => {
          if (anomaly.severity === 'high' || anomaly.severity === 'medium') {
            addAlert({
              id: `anomaly-${Date.now()}-${index}`,
              type: 'anomaly',
              title: `${anomaly.severity === 'high' ? 'Critical' : 'Warning'}: ${anomaly.metric} Anomaly`,
              message: `${anomaly.metric} deviated by ${Math.abs(anomaly.deviation).toFixed(1)}% at ${new Date(anomaly.timestamp).toLocaleDateString()}`,
              severity: anomaly.severity === 'high' ? 'critical' : 'warning',
              created_at: new Date().toISOString(),
              read: false
            });
          }
        });

        addInsight({
          id: `prediction-${Date.now()}`,
          type: 'prediction',
          dataset_id: currentDataset.id,
          title: `${primaryMetric} Forecast`,
          description: `Predicted ${primaryMetric} for the next 30 periods with ${((predictionResult.accuracy_score || 0) * 100).toFixed(1)}% confidence`,
          data: predictionResult,
          created_at: new Date().toISOString()
        });

        if (detectedAnomalies.length > 0) {
          addInsight({
            id: `anomaly-${Date.now()}`,
            type: 'anomaly',
            dataset_id: currentDataset.id,
            title: 'Anomalies Detected',
            description: `Found ${detectedAnomalies.length} anomalies in ${primaryMetric}`,
            severity: detectedAnomalies.some(a => a.severity === 'high') ? 'high' : 'medium',
            data: detectedAnomalies,
            created_at: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRoleDashboardTitle = () => {
    switch (user?.role) {
      case 'sales':
        return 'Sales Dashboard';
      case 'marketing':
        return 'Marketing Dashboard';
      case 'product':
        return 'Product Dashboard';
      case 'analyst':
        return 'Analytics Dashboard';
      default:
        return 'Business Dashboard';
    }
  };

  const getIconForKPI = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('revenue') || lowerName.includes('sales') || lowerName.includes('price')) {
      return <DollarSign className="w-5 h-5" />;
    }
    if (lowerName.includes('customer') || lowerName.includes('user')) {
      return <Users className="w-5 h-5" />;
    }
    if (lowerName.includes('order') || lowerName.includes('transaction')) {
      return <ShoppingCart className="w-5 h-5" />;
    }
    if (lowerName.includes('growth') || lowerName.includes('trend')) {
      return <TrendingUp className="w-5 h-5" />;
    }
    return <Activity className="w-5 h-5" />;
  };

  if (!currentDataset) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Data Selected</h2>
        <p className="text-gray-600">Upload a dataset to see your business insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{getRoleDashboardTitle()}</h1>
            <p className="text-blue-100">
              Analyzing: {currentDataset.name} ({currentDataset.row_count.toLocaleString()} records)
            </p>
          </div>
          {isAnalyzing && (
            <div className="flex items-center gap-2 bg-blue-500 px-4 py-2 rounded-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-sm">Analyzing...</span>
            </div>
          )}
        </div>
      </div>

      {kpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.slice(0, 4).map((kpi) => (
            <KPICard
              key={kpi.id}
              title={kpi.name}
              value={kpi.value}
              change={kpi.change}
              trend={kpi.trend}
              unit={kpi.unit}
              icon={getIconForKPI(kpi.name)}
            />
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">AI Recommendations</h2>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-700">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {predictions && predictions.predictions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LineChart
            data={predictions.predictions.map(p => ({
              label: p.date.split('-')[2],
              value: p.value
            }))}
            title={`${predictions.metric} - 30 Day Forecast`}
            color="#3b82f6"
          />

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Prediction Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Model Type</p>
                <p className="text-sm font-medium text-gray-900">{predictions.model_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Accuracy Score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(predictions.accuracy_score || 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {((predictions.accuracy_score || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Next Period Prediction</p>
                <p className="text-2xl font-bold text-gray-900">
                  {predictions.predictions[0]?.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Range: {predictions.predictions[0]?.confidence_lower.toFixed(0)} - {predictions.predictions[0]?.confidence_upper.toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {anomalies.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Anomalies Detected ({anomalies.length})
            </h2>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {anomalies.map((anomaly, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  anomaly.severity === 'high'
                    ? 'bg-red-50 border-red-200'
                    : anomaly.severity === 'medium'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {anomaly.metric} at {new Date(anomaly.timestamp).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Value: {anomaly.value.toFixed(2)} (Expected: {anomaly.expected_value.toFixed(2)})
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      anomaly.severity === 'high'
                        ? 'bg-red-200 text-red-900'
                        : anomaly.severity === 'medium'
                        ? 'bg-orange-200 text-orange-900'
                        : 'bg-yellow-200 text-yellow-900'
                    }`}
                  >
                    {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
