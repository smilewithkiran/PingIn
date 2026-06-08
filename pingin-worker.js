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

      if (action === 'parseJD') {
        const { jdText } = body;
        if (!jdText) return new Response(JSON.stringify({ error: 'Missing jdText' }), { status: 400, headers: CORS });
        const result = await parseJobDescription(jdText, env.ANTHROPIC_API_KEY);
        return new Response(JSON.stringify(result), { headers: CORS });
      }

      if (action === 'scoreProfilesVsJD') {
        const { profiles, jdText } = body;
        if (!profiles || !jdText) return new Response(JSON.stringify({ error: 'Missing profiles or jdText' }), { status: 400, headers: CORS });
        const result = await scoreVsJD(profiles, jdText, env.ANTHROPIC_API_KEY);
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

async function scoreVsJD(profiles, jdText, apiKey) {
  const profileLines = profiles.slice(0, 30).map((p, i) => {
    const parts = [p.name];
    if (p.role && p.role.length > 2) parts.push(p.role);
    if (p.company) parts.push('at ' + p.company);
    if (p.city) parts.push(p.city);
    if (p.isOTW) parts.push('[Open to Work]');
    if (p.degree) parts.push(p.degree + ' connection');
    return `${i + 1}. ${parts.join(' | ')}`;
  }).join('\n');

  const prompt = `You are a senior recruiter. Evaluate these LinkedIn profiles against the job description below.

JOB DESCRIPTION:
${jdText.substring(0, 2000)}

PROFILES:
${profileLines}

Score each profile 0-100 for JD fit:
- 85-100: Near-perfect (title, skills, experience all match JD)
- 65-84: Strong match (most core requirements met)
- 40-64: Partial match (some requirements met, some gaps)
- 0-39: Poor fit (wrong role, missing key skills, wrong level)

IMPORTANT: Penalise heavily for wrong role type (e.g. HR/Recruiter profiles for a tech JD = max 15).

For each profile return:
- score (0-100)
- reason (max 8 words)
- strengths (top 2 matching points, comma separated)
- gaps (top 1-2 missing requirements)

Return ONLY valid JSON array:
[{"index":1,"score":88,"reason":"Exact title match, right exp level","strengths":"Senior Dev title, banking domain","gaps":"No Python mentioned"}]`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
  });

  if (!resp.ok) throw new Error('Anthropic API error: ' + resp.status);
  const data = await resp.json();
  const text = data.content?.[0]?.text || '[]';
  const scores = JSON.parse(text.replace(/```json|```/g, '').trim());

  return {
    ok: true,
    scores: profiles.map((p, i) => {
      const s = scores.find(x => x.index === i + 1) || { score: 0, reason: '', strengths: '', gaps: '' };
      return { ...p, _score: s.score, _reason: s.reason, _strengths: s.strengths || '', _gaps: s.gaps || '' };
    })
  };
}

async function parseJobDescription(jdText, apiKey) {
  const prompt = `You are a senior technical recruiter in India. Parse this job description and extract search data.

CRITICAL RULES:
- searchKeywords: Use the SPECIFIC technical role, NOT generic titles.
  BAD: "Software Engineer" | GOOD: "Java Backend Developer", "Senior React Developer", "Python Data Engineer"
  If JD mentions Java + Spring + Microservices → searchKeywords = "Java Backend Developer"
  If JD mentions React + TypeScript → searchKeywords = "React Developer"
  If JD mentions Python + ML → searchKeywords = "Machine Learning Engineer"
- topSkills: ONLY specific technologies/tools from the JD (max 4).
  Examples: "Spring Boot", "Microservices", "REST API", "Kubernetes"
  NEVER: "communication", "teamwork", "leadership", "problem solving"
- expFilter: 1=0-1yr, 2=1-3yr, 3=3-5yr, 4=5-10yr, 5=10+yr

JD:
${jdText.substring(0, 2500)}

Return ONLY valid JSON:
{
  "jobTitle": "exact title from JD",
  "searchKeywords": "specific tech role 2-4 words",
  "topSkills": ["tech1", "tech2", "tech3", "tech4"],
  "experienceYears": "X-Y years",
  "expFilter": "4",
  "locations": ["City"],
  "roleCategory": "engineer"
}`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, messages: [{ role: 'user', content: prompt }] })
  });

  if (!resp.ok) throw new Error('Anthropic error: ' + resp.status);
  const data = await resp.json();
  const text = data.content?.[0]?.text || '{}';
  const parsed = JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim());
  return { ok: true, parsed };
}
