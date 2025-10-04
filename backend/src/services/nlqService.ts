import { DataColumn } from '../types';

export interface NLQResult {
  sql?: string;
  explanation: string;
  confidence: number;
  results?: Record<string, any>[];
  visualization_type?: 'table' | 'line' | 'bar' | 'pie' | 'scatter';
}

/**
 * Translate natural language query to SQL using backend API
 */
export const translateNLQtoSQL = async (
  query: string,
  columns: DataColumn[],
  tableName: string = 'data'
): Promise<NLQResult> => {
  try {
    const response = await fetch('http://localhost:4000/nlq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, columns, tableName })
    });

    if (!response.ok) throw new Error('Backend NLQ call failed');

    return await response.json();
  } catch (error) {
    console.error('NLQ translation error:', error);
    return simulateNLQResponse(query, columns, tableName); // fallback
  }
};

/**
 * Execute SQL query on local dataset
 */
export const executeQuery = (sql: string, data: Record<string, any>[]): Record<string, any>[] => {
  try {
    const lowerSQL = sql.toLowerCase();

    if (lowerSQL.includes('select count(*)')) {
      return [{ total_count: data.length }];
    }

    if (lowerSQL.includes('avg(') || lowerSQL.includes('average')) {
      const match = sql.match(/avg\((\w+)\)/i);
      if (match) {
        const column = match[1];
        const values = data.map(row => Number(row[column])).filter(v => !isNaN(v));
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return [{ [`average_${column}`]: avg.toFixed(2) }];
      }
    }

    if (lowerSQL.includes('sum(')) {
      const match = sql.match(/sum\((\w+)\)/i);
      if (match) {
        const column = match[1];
        const sum = data.reduce((total, row) => total + (Number(row[column]) || 0), 0);
        return [{ [`total_${column}`]: sum }];
      }
    }

    if (lowerSQL.includes('group by')) {
      const groupMatch = sql.match(/group by (\w+)/i);
      const sumMatch = sql.match(/sum\((\w+)\)/i);

      if (groupMatch && sumMatch) {
        const groupCol = groupMatch[1];
        const sumCol = sumMatch[1];

        const grouped: Record<string, number> = {};
        data.forEach(row => {
          const key = row[groupCol];
          grouped[key] = (grouped[key] || 0) + (Number(row[sumCol]) || 0);
        });

        return Object.entries(grouped)
          .map(([key, value]) => ({ [groupCol]: key, total: value }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 20);
      }
    }

    if (lowerSQL.includes('order by') && lowerSQL.includes('desc')) {
      const match = sql.match(/order by (\w+) desc/i);
      if (match) {
        const column = match[1];
        return [...data]
          .sort((a, b) => (Number(b[column]) || 0) - (Number(a[column]) || 0))
          .slice(0, 10);
      }
    }

    if (lowerSQL.includes('order by') && lowerSQL.includes('asc')) {
      const match = sql.match(/order by (\w+) asc/i);
      if (match) {
        const column = match[1];
        return [...data]
          .sort((a, b) => (Number(a[column]) || 0) - (Number(b[column]) || 0))
          .slice(0, 10);
      }
    }

    return data.slice(0, 10);
  } catch (error) {
    console.error('Query execution error:', error);
    return data.slice(0, 10);
  }
};

/**
 * Generate insight summary using backend API
 */
export const generateInsightSummary = async (data: Record<string, any>[], query: string): Promise<string> => {
  try {
    const response = await fetch('http://localhost:4000/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, query })
    });

    if (!response.ok) throw new Error('Backend insight call failed');
    const result = await response.json();
    return result.insight || `Analysis: Found ${data.length} records matching your query.`;
  } catch (error) {
    console.error('Insight generation error:', error);
    return `Analysis: Found ${data.length} records matching your query.`;
  }
};

/**
 * Fallback simulation if backend is unavailable
 */
const simulateNLQResponse = (query: string, columns: DataColumn[], tableName: string): NLQResult => {
  const lowerQuery = query.toLowerCase();
  const numericColumns = columns.filter(c => c.type === 'number').map(c => c.name);
  const dateColumns = columns.filter(c => c.type === 'date').map(c => c.name);

  let sql = '';
  let explanation = '';
  let visualization_type: NLQResult['visualization_type'] = 'table';

  if (lowerQuery.includes('average') || lowerQuery.includes('avg') || lowerQuery.includes('mean')) {
    const column = numericColumns[0] || columns[0].name;
    sql = `SELECT AVG(${column}) as average_${column} FROM ${tableName}`;
    explanation = `Calculates the average of ${column}`;
  } else if (lowerQuery.includes('sum') || lowerQuery.includes('total')) {
    const column = numericColumns[0] || columns[0].name;
    sql = `SELECT SUM(${column}) as total_${column} FROM ${tableName}`;
    explanation = `Calculates the total sum of ${column}`;
  } else if (lowerQuery.includes('count') || lowerQuery.includes('how many')) {
    sql = `SELECT COUNT(*) as total_count FROM ${tableName}`;
    explanation = `Counts the total number of records`;
  } else if (lowerQuery.includes('trend') || lowerQuery.includes('over time')) {
    const dateCol = columns.find(c => c.type === 'date')?.name || columns[0].name;
  const valueCol = columns.find(c => c.name.toLowerCase().includes('revenue') && c.type === 'number')?.name
                   || columns.find(c => c.type === 'number')?.name 
                   || columns[1]?.name 
                   || columns[0].name;
    sql = `SELECT ${dateCol}, ${valueCol} FROM ${tableName} ORDER BY ${dateCol} LIMIT 1000`;
    explanation = `Shows trends of ${valueCol} over ${dateCol}`;
    visualization_type = 'bar';
  } else {
    sql = `SELECT * FROM ${tableName} LIMIT 100`;
    explanation = `Shows a sample of the data`;
  }

  return {
    sql,
    explanation,
    confidence: 0.8,
    visualization_type:'bar',
  };
};
