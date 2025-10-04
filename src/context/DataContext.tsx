import React, { createContext, useContext, useState } from 'react';
import { Dataset, Alert, Insight } from '../types';

interface DataContextType {
  datasets: Dataset[];
  currentDataset: Dataset | null;
  alerts: Alert[];
  insights: Insight[];
  addDataset: (dataset: Dataset) => void;
  setCurrentDataset: (dataset: Dataset | null) => void;
  addAlert: (alert: Alert) => void;
  markAlertAsRead: (alertId: string) => void;
  addInsight: (insight: Insight) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);

  const addDataset = (dataset: Dataset) => {
    setDatasets(prev => [...prev, dataset]);
  };

  const addAlert = (alert: Alert) => {
    setAlerts(prev => [alert, ...prev]);
  };

  const markAlertAsRead = (alertId: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  };

  const addInsight = (insight: Insight) => {
    setInsights(prev => [insight, ...prev]);
  };

  return (
    <DataContext.Provider
      value={{
        datasets,
        currentDataset,
        alerts,
        insights,
        addDataset,
        setCurrentDataset,
        addAlert,
        markAlertAsRead,
        addInsight
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};
