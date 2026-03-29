export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key is missing.' });
  }

  const { input, email } = req.body;
  if (!input) {
    return res.status(400).json({ error: 'Symptom input is required' });
  }

  const SYSTEM_PROMPT = `You are SymptomSense, a medical symptom analysis assistant powered by Aurex AI. Analyze user symptoms and provide concise, medically precise preliminary guidance.
RULES:
1. You provide PRELIMINARY GUIDANCE only — NOT a medical diagnosis.
2. Be medically precise and evidence-based.
3. Err on the side of caution for anything potentially serious.
4. Detect dangerous symptom combinations (e.g., headache + fever + stiff neck = meningitis).
5. Return ONLY valid JSON — no markdown, no code fences.
RESPONSE FORMAT (strict JSON):
{
  "severity": {
    "level": "mild|moderate|high|urgent",
    "label": "Mild|Moderate|High|Urgent",
    "description": "One short sentence about concern level"
  },
  "matchedNames": ["symptom1", "symptom2"],
  "comboAlerts": [{"alert": "One clear sentence", "icon": "🚑 or 🏥"}],
  "causes": ["cause 1", "cause 2", "cause 3"],
  "care": ["care 1", "care 2", "care 3"],
  "doctor": ["reason 1", "reason 2", "reason 3"],
  "tips": ["tip 1", "tip 2"]
}
SEVERITY: mild (home care), moderate (monitor/consider doctor), high (see doctor soon), urgent (CALL 911).
COMBO ALERTS: Only for genuinely dangerous combinations. Empty array [] if none.
KEY CONSTRAINTS:
- EXACTLY 3 items for causes, care, and doctor
- EXACTLY 2 items for tips
- Keep each item to ONE concise sentence
- Be specific with numbers
- Use plain English
- NEVER recommend prescription medications`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: input }
        ],
        max_tokens: 2048,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: errorData.error?.message || 'API request failed' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const result = JSON.parse(content);

    // Save to Supabase using fetch (no SDK needed)
    if (email && supabaseUrl && supabaseKey) {
      await fetch(`${supabaseUrl}/rest/v1/symptom_history`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          email: email,
          query: input,
          severity_level: result.severity.level,
          severity_label: result.severity.label,
          causes: result.causes
        })
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('SERVER ERROR:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
