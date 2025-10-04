// backend/src/routes/insight.ts
import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

// Endpoint to generate insights
router.post('/', async (req, res) => {
  try {
    const { data, query } = req.body;

    if (!data || !query) {
      return res.status(400).json({ error: 'Missing data or query' });
    }

    // Use OpenAI API key from environment
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.json({
        insight: `Analysis: Found ${data.length} records. Key metrics include numerical summaries and trends.`
      });
    }

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
            content: 'You are a Senior business analyst. Provide concise, actionable insights from data.'
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

    if (!response.ok) {
      throw new Error('OpenAI API call failed');
    }

    const result = await response.json();
    const insight = result.choices[0]?.message?.content || `Analysis: Found ${data.length} records.`;

    res.json({ insight });
  } catch (error) {
    console.error('Insight generation error:', error);
    res.json({
      insight: `Analysis: Found ${req.body.data?.length || 0} records matching your query.`
    });
  }
});

export default router;
