export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  const apiKey = process.env.ANTHROPIC_API_KEY;
 
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en Vercel' });
  }
 
  try {
    const { system, user } = req.body;
 
    if (!user) return res.status(400).json({ error: 'Falta el mensaje' });
 
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: system || '',
        messages: [{ role: 'user', content: user }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });
 
    const data = await response.json();
 
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'Error de Anthropic',
        details: data
      });
    }
 
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');
 
    return res.status(200).json({ text });
 
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
