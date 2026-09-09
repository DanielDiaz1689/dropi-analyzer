import { createClient } from '@supabase/supabase-js'

// Cliente de Supabase para verificar usuarios (usa variables del servidor)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = 'daniel2001barragan@gmail.com'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Verificar autenticación ──────────────────────────────────────────────
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'No autorizado — inicia sesión para usar esta función' })
  }

  // Validar el JWT con Supabase
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)

  if (authErr || !user) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' })
  }

  // Si no es el admin, verificar que esté aprobado en la tabla de usuarios
  if (user.email !== ADMIN_EMAIL) {
    const { data: perfil } = await supabaseAdmin
      .from('usuarios')
      .select('aprobado')
      .eq('id', user.id)
      .single()

    if (!perfil?.aprobado) {
      return res.status(403).json({ error: 'Tu cuenta aún no ha sido aprobada por el administrador' })
    }
  }

  // ── Llamada a Anthropic ───────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Body inválido' });
    }

    const { system, user: userMsg } = body;
    if (!userMsg) return res.status(400).json({ error: 'Falta el campo user' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: system || '',
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'Error Anthropic',
        raw: data,
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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
