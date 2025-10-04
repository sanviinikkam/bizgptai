import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/nlq', async (req, res) => {
  const { query, columns, tableName } = req.body;

  if (!query || !columns) {
    return res.status(400).json({ error: 'Query and columns are required' });
  }

  // Build schema description
  const schema = columns.map((col: any) => `${col.name} (${col.type})`).join(', ');
  const prompt = `
You are a SQL expert. Convert the following natural language query into a SQL query.

Table schema: ${tableName} with columns: ${schema}

Rules:
1. Only use columns that exist in the schema
2. Return valid SQLite syntax
3. Use proper aggregations (SUM, AVG, COUNT, etc.)
4. Add WHERE clauses for filtering
5. Use GROUP BY when needed
6. Limit results to 1000 rows

Return JSON:
{
  "sql": "SELECT ...",
  "explanation": "This query ...",
  "confidence": 0.95,
  "visualization_type": "table"
}

Query: ${query}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    });

    const resultText = response.choices[0].message?.content || '{}';
    const result = JSON.parse(resultText);

    res.json(result);
  } catch (error: any) {
    console.error('NLQ backend error:', error.message);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

app.listen(process.env.PORT || 4000, () => {
  console.log(`NLQ backend running on port ${process.env.PORT || 4000}`);
});
