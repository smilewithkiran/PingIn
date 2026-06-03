// PingIN AI Worker — deploy to Cloudflare
// Add ANTHROPIC_API_KEY as an Environment Secret in Cloudflare dashboard
// Worker URL: pingin-ai.hr-kiranm.workers.dev

export default {
  async fetch(request, env) {
    // CORS headers for Chrome extension
    const CORS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS });
    }

    try {
      const body = await request.json();
      const { action, profiles, searchParams } = body;

      if (action === 'scoreProfiles') {
        const result = await scoreProfiles(profiles, searchParams, env.ANTHROPIC_API_KEY);
        return new Response(JSON.stringify(result), { headers: CORS });
      }

      return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: CORS });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
    }
  }
};

async function scoreProfiles(profiles, searchParams, apiKey) {
  const role     = searchParams?.keywords || '';
  const location = searchParams?.location || '';
  const exp      = searchParams?.experience || '';

  const profileLines = profiles.slice(0, 30).map((p, i) => {
    const parts = [p.name];
    if (p.role && p.role.length > 2) parts.push(p.role);
    if (p.company) parts.push('at ' + p.company);
    if (p.city) parts.push(p.city);
    if (p.isOTW) parts.push('[Open to Work]');
    if (p.degree) parts.push(p.degree + ' connection');
    return `${i + 1}. ${parts.join(' · ')}`;
  }).join('\n');

  const prompt = `You are a senior recruiter in India. Score these LinkedIn profiles for this search:

Role: ${role}
Location: ${location || 'Any'}
Experience: ${exp || 'Any'}

Profiles:
${profileLines}

Score each 0-100:
- 90-100: Exact title match + right city + relevant exp
- 70-89: Close title match + mostly right location  
- 40-69: Related role or some location match
- 0-39: Wrong role or clearly wrong city (e.g. Bengaluru profile for Mumbai search)

IMPORTANT: Penalize heavily for wrong city (Hyderabad/Bengaluru for Mumbai search = max 30).
Penalize heavily for wrong role (HR/Recruiter/TA for technical search = max 20).

Return ONLY JSON array: [{"index":1,"score":85,"reason":"PM title, Mumbai-based"}]`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!resp.ok) throw new Error('Anthropic API error: ' + resp.status);

  const data = await resp.json();
  const text = data.content?.[0]?.text || '[]';
  const scores = JSON.parse(text.replace(/```json|```/g, '').trim());

  return {
    ok: true,
    scores: profiles.map((p, i) => {
      const s = scores.find(x => x.index === i + 1) || { score: 0, reason: '' };
      return { ...p, _score: s.score, _reason: s.reason };
    })
  };
}
