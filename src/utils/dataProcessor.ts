import { DataColumn } from '../types';

export interface ProcessedData {
  columns: DataColumn[];
  rows: Record<string, any>[];
  summary: {
    total_rows: number;
    total_columns: number;
    missing_values: Record<string, number>;
    duplicates: number;
  };
}

export const parseCSV = (content: string): Record<string, any>[] => {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, any> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });

    rows.push(row);
  }

  return rows;
};

export const detectColumnType = (values: any[]): 'string' | 'number' | 'date' | 'boolean' => {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

  if (nonNullValues.length === 0) return 'string';

  const allNumbers = nonNullValues.every(v => !isNaN(Number(v)));
  if (allNumbers) return 'number';

  const allBooleans = nonNullValues.every(v =>
    v === true || v === false || v === 'true' || v === 'false' || v === '0' || v === '1'
  );
  if (allBooleans) return 'boolean';

  const allDates = nonNullValues.every(v => !isNaN(Date.parse(v)));
  if (allDates) return 'date';

  return 'string';
};

export const cleanData = (data: Record<string, any>[]): Record<string, any>[] => {
  const cleaned = data.map(row => {
    const cleanedRow: Record<string, any> = {};

    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined || value === '') {
        cleanedRow[key] = null;
      } else {
        cleanedRow[key] = value;
      }
    }

    return cleanedRow;
  });

  return cleaned;
};

export const removeDuplicates = (data: Record<string, any>[]): Record<string, any>[] => {
  const seen = new Set<string>();
  const unique: Record<string, any>[] = [];

  for (const row of data) {
    const rowString = JSON.stringify(row);
    if (!seen.has(rowString)) {
      seen.add(rowString);
      unique.push(row);
    }
  }

  return unique;
};

export const fillMissingValues = (data: Record<string, any>[], columns: DataColumn[]): Record<string, any>[] => {
  const filled = data.map(row => ({ ...row }));

  for (const column of columns) {
    const values = filled.map(row => row[column.name]).filter(v => v !== null && v !== undefined);

    if (values.length === 0) continue;

    if (column.type === 'number') {
      const avg = values.reduce((sum, v) => sum + Number(v), 0) / values.length;
      filled.forEach(row => {
        if (row[column.name] === null || row[column.name] === undefined) {
          row[column.name] = avg;
        }
      });
    } else if (column.type === 'string') {
      const mode = values.sort((a, b) =>
        values.filter(v => v === a).length - values.filter(v => v === b).length
      ).pop();
      filled.forEach(row => {
        if (row[column.name] === null || row[column.name] === undefined) {
          row[column.name] = mode || '';
        }
      });
    }
  }

  return filled;
};

export const normalizeData = (data: Record<string, any>[], columns: DataColumn[]): Record<string, any>[] => {
  const normalized = data.map(row => ({ ...row }));

  for (const column of columns) {
    if (column.type === 'number') {
      const values = normalized.map(row => Number(row[column.name])).filter(v => !isNaN(v));
      const min = Math.min(...values);
      const max = Math.max(...values);

      if (max > min) {
        normalized.forEach(row => {
          const value = Number(row[column.name]);
          if (!isNaN(value)) {
            row[column.name + '_normalized'] = (value - min) / (max - min);
          }
        });
      }
    }
  }

  return normalized;
};

export const processDataset = (rawData: Record<string, any>[]): ProcessedData => {
  if (!rawData || rawData.length === 0) {
    throw new Error('No data to process');
  }

  const cleaned = cleanData(rawData);
  const unique = removeDuplicates(cleaned);

  const columnNames = Object.keys(unique[0]);
  const columns: DataColumn[] = columnNames.map(name => {
    const values = unique.map(row => row[name]);
    const type = detectColumnType(values);
    const nonNullValues = values.filter(v => v !== null && v !== undefined);

    return {
      name,
      type,
      nullable: nonNullValues.length < unique.length,
      unique_count: new Set(nonNullValues).size
    };
  });

  const filled = fillMissingValues(unique, columns);

  const missingValues: Record<string, number> = {};
  for (const column of columns) {
    const nullCount = cleaned.filter(row =>
      row[column.name] === null || row[column.name] === undefined
    ).length;
    if (nullCount > 0) {
      missingValues[column.name] = nullCount;
    }
  }

  return {
    columns,
    rows: filled,
    summary: {
      total_rows: filled.length,
      total_columns: columns.length,
      missing_values: missingValues,
      duplicates: rawData.length - unique.length
    }
  };
};

export const generateStatistics = (data: Record<string, any>[], columns: DataColumn[]) => {
  const stats: Record<string, any> = {};

  for (const column of columns) {
    if (column.type === 'number') {
      const values = data.map(row => Number(row[column.name])).filter(v => !isNaN(v));

      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        stats[column.name] = {
          count: values.length,
          mean: mean.toFixed(2),
          median: median.toFixed(2),
          std_dev: stdDev.toFixed(2),
          min: Math.min(...values),
          max: Math.max(...values),
          q1: sorted[Math.floor(sorted.length * 0.25)],
          q3: sorted[Math.floor(sorted.length * 0.75)]
        };
      }
    }
  }

  return stats;
};
