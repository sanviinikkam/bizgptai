import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Dataset } from '../types';
import { parseCSV, processDataset } from '../utils/dataProcessor';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export const DataUpload: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { addDataset } = useData();
  const { user } = useAuth();

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are supported');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const content = await file.text();
      const rawData = parseCSV(content);

      if (!rawData || rawData.length === 0) {
        throw new Error('No data found in file');
      }

      const processed = processDataset(rawData);

      const dataset: Dataset = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name.replace('.csv', ''),
        file_name: file.name,
        uploaded_by: user?.id || 'demo',
        uploaded_at: new Date().toISOString(),
        row_count: processed.rows.length,
        column_count: processed.columns.length,
        columns: processed.columns,
        status: 'ready',
        preview_data: processed.rows.slice(0, 5)
      };

      localStorage.setItem(`dataset_${dataset.id}`, JSON.stringify(processed.rows));

      addDataset(dataset);
      setSuccess(`Successfully uploaded ${file.name} with ${processed.rows.length} rows`);

      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 rounded-lg">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Upload Business Data</h2>
          <p className="text-sm text-gray-500">Upload CSV files to analyze your business metrics</p>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-gray-600 font-medium">Processing your data...</p>
            <p className="text-sm text-gray-500">Cleaning, validating, and analyzing</p>
          </div>
        ) : (
          <>
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop your CSV file here
            </p>
            <p className="text-sm text-gray-500 mb-6">
              or click to browse
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Select File
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Upload Failed</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-900">Upload Successful</p>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Automated Processing</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-700">Data Cleaning</p>
              <p className="text-xs text-gray-500">Removes duplicates & handles nulls</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-700">Type Detection</p>
              <p className="text-xs text-gray-500">Auto-identifies data types</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-700">Validation</p>
              <p className="text-xs text-gray-500">Ensures data quality</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-700">Statistics</p>
              <p className="text-xs text-gray-500">Generates summary metrics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
