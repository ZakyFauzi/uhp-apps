// UHP v2.0 — Netlify Serverless Function
// Proxies chat requests to Google Gemini API, keeping the key server-side

exports.handler = async function(event) {
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

    // API key: check Netlify env var first
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_PLACEHOLDER') {
      console.warn('GEMINI_API_KEY is not configured.');
      return {
        statusCode: 200, // Return 200 so the client displays the explanation directly
        headers,
        body: JSON.stringify({ 
          reply: '⚠️ **Konfigurasi API Key Dibutuhkan**: UHePi belum dikonfigurasi dengan API Key Gemini Anda di Netlify. Silakan buka dashboard Netlify Anda, masuk ke **Site configuration** > **Environment variables**, lalu tambahkan variabel `GEMINI_API_KEY` dengan API Key Gemini Anda (misalnya: `AIzaSy...`). Setelah itu, lakukan redeploy.' 
        }),
      };
    }

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Convert OpenAI-style messages to Gemini format
    let systemInstruction = '';
    const contents = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
      } else if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

    const geminiBody = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    // Only add systemInstruction if present
    if (systemInstruction) {
      geminiBody.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Gemini API error:', response.status, errBody);
      return {
        statusCode: 200, // Return 200 with error details as chatbot message
        headers,
        body: JSON.stringify({ 
          reply: `❌ **Kendala API Gemini (Status ${response.status})**: Gagal mendapatkan respons dari Google Gemini. Detail kesalahan: \`${errBody.substring(0, 200)}\`. Pastikan API Key Anda aktif dan valid.` 
        }),
      };
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      || 'Maaf, saya tidak bisa merespons saat ini.';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply }),
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        reply: `❌ **Internal Server Error**: Terjadi kesalahan pada serverless function Netlify. Detail: \`${err.message}\`` 
      }),
    };
  }
};
