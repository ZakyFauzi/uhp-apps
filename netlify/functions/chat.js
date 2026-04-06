// UHP v2.0 — Netlify Serverless Function
// Proxies chat requests to OpenRouter API, keeping the key server-side

exports.handler = async function(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { messages } = JSON.parse(event.body);

    if (!messages || !Array.isArray(messages)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid messages format' }) };
    }

    // API key from Netlify environment variable
    const apiKey = process.env.OPENROUTER_API_KEY || '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';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://uhp-apps.netlify.app',
        'X-Title': 'UHP - UMKM Health Predictor',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('OpenRouter error:', response.status, errBody);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `OpenRouter API error: ${response.status}` }),
      };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Maaf, saya tidak bisa merespons saat ini.';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply }),
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
