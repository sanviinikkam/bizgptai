import React from 'react';
import { Database, CheckCircle } from 'lucide-react';
import { useData } from '../context/DataContext';

export const DatasetSelector: React.FC = () => {
  const { datasets, currentDataset, setCurrentDataset } = useData();

  if (datasets.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Database className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Your Datasets</h2>
      </div>

      <div className="space-y-2">
        {datasets.map((dataset) => (
          <button
            key={dataset.id}
            onClick={() => setCurrentDataset(dataset)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              currentDataset?.id === dataset.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{dataset.name}</h3>
                  {currentDataset?.id === dataset.id && (
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {dataset.row_count.toLocaleString()} rows × {dataset.column_count} columns
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Uploaded {new Date(dataset.uploaded_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
