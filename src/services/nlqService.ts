import { DataColumn } from '../types';

export interface NLQResult {
  sql?: string;
  explanation: string;
  confidence: number;
  results?: Record<string, any>[];
  visualization_type?: 'table' | 'line' | 'bar' | 'pie' | 'scatter';
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

export const translateNLQtoSQL = async (
  query: string,
  columns: DataColumn[],
  tableName: string = 'data'
): Promise<NLQResult> => {
  const schema = columns.map(col => `${col.name} (${col.type})`).join(', ');

  const systemPrompt = `You are a SQL expert. Convert natural language questions to SQL queries.
Table schema: ${tableName} with columns: ${schema}

Rules:
1. Only use columns that exist in the schema
2. Return valid SQLite syntax
3. Use proper aggregations (SUM, AVG, COUNT, etc.)
4. Add WHERE clauses for filtering
5. Use GROUP BY when needed
6. Always limit results to 1000 rows

Return JSON with:
{
  "sql": "SELECT ...",
  "explanation": "This query...",
  "confidence": 0.95,
  "visualization_type": "bar"
}`;

  try {
    if (!OPENAI_API_KEY) {
      return simulateNLQResponse(query, columns, tableName);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error('Failed to translate query');
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return result;
  } catch (error) {
    console.error('NLQ translation error:', error);
    return simulateNLQResponse(query, columns, tableName);
  }
};

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
    visualization_type = 'table';
  } else if (lowerQuery.includes('sum') || lowerQuery.includes('total')) {
    const column = numericColumns[0] || columns[0].name;
    sql = `SELECT SUM(${column}) as total_${column} FROM ${tableName}`;
    explanation = `Calculates the total sum of ${column}`;
    visualization_type = 'table';
  } else if (lowerQuery.includes('count') || lowerQuery.includes('how many')) {
    sql = `SELECT COUNT(*) as total_count FROM ${tableName}`;
    explanation = `Counts the total number of records`;
    visualization_type = 'table';
  } else if (lowerQuery.includes('trend') || lowerQuery.includes('over time')) {
    const dateCol = dateColumns[0] || columns[0].name;
    const valueCol = numericColumns[0] || columns[1]?.name || columns[0].name;
    sql = `SELECT ${dateCol}, ${valueCol} FROM ${tableName} ORDER BY ${dateCol} LIMIT 1000`;
    explanation = `Shows trends of ${valueCol} over ${dateCol}`;
    visualization_type = 'line';
  } else if (lowerQuery.includes('group by') || lowerQuery.includes('breakdown') || lowerQuery.includes('by category')) {
    const groupCol = columns.find(c => c.type === 'string')?.name || columns[0].name;
    const valueCol = numericColumns[0] || columns[1]?.name || columns[0].name;
    sql = `SELECT ${groupCol}, SUM(${valueCol}) as total FROM ${tableName} GROUP BY ${groupCol} LIMIT 20`;
    explanation = `Groups data by ${groupCol} and shows totals`;
    visualization_type = 'bar';
  } else if (lowerQuery.includes('top') || lowerQuery.includes('highest') || lowerQuery.includes('best')) {
    const valueCol = numericColumns[0] || columns[0].name;
    sql = `SELECT * FROM ${tableName} ORDER BY ${valueCol} DESC LIMIT 10`;
    explanation = `Shows top 10 records by ${valueCol}`;
    visualization_type = 'bar';
  } else if (lowerQuery.includes('bottom') || lowerQuery.includes('lowest') || lowerQuery.includes('worst')) {
    const valueCol = numericColumns[0] || columns[0].name;
    sql = `SELECT * FROM ${tableName} ORDER BY ${valueCol} ASC LIMIT 10`;
    explanation = `Shows bottom 10 records by ${valueCol}`;
    visualization_type = 'bar';
  } else {
    sql = `SELECT * FROM ${tableName} LIMIT 100`;
    explanation = `Shows a sample of the data`;
    visualization_type = 'table';
  }

  return {
    sql,
    explanation,
    confidence: 0.8,
    visualization_type
  };
};

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

    return data.slice(0, 100);
  } catch (error) {
    console.error('Query execution error:', error);
    return data.slice(0, 100);
  }
};

export const generateInsightSummary = async (data: Record<string, any>[], query: string): Promise<string> => {
  if (!OPENAI_API_KEY) {
    return `Analysis: Found ${data.length} records. Key metrics include numerical summaries and trends based on the available data.`;
  }

  try {
    const dataSample = JSON.stringify(data.slice(0, 5), null, 2);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst. Provide concise, actionable insights from data.'
          },
          {
            role: 'user',
            content: `Query: ${query}\n\nResults sample:\n${dataSample}\n\nProvide a brief business insight (2-3 sentences).`
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error) {
    console.error('Insight generation error:', error);
    return `Analysis: Found ${data.length} records matching your query.`;
  }
};
