export default async function handler(req, res) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key is missing from environment variables.' });
  }

  const { input } = req.body;
  if (!input) {
    return res.status(400).json({ error: 'Symptom input is required' });
  }

  // 2. The secure System Prompt (hidden from the frontend so no one can alter it)
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
  "comboAlerts": [
    {
      "alert": "One clear sentence about the dangerous combination and what to do",
      "icon": "🚑 or 🏥"
    }
  ],
  "causes": [
    "Most likely cause — brief explanation",
    "Second likely cause — brief explanation",
    "Third possible cause — brief explanation"
  ],
  "care": [
    "Most important self-care action",
    "Second key self-care step",
    "Third helpful action"
  ],
  "doctor": [
    "Most critical red flag requiring medical attention",
    "Second warning sign to watch for",
    "Third reason to see a doctor"
  ],
  "tips": [
    "Key practical tip",
    "Second useful tip"
  ]
}

SEVERITY: mild (home care), moderate (monitor/consider doctor), high (see doctor soon), urgent (CALL 911).

COMBO ALERTS: Only for genuinely dangerous combinations. 🚑 = life-threatening (heart attack, stroke, meningitis, PE). 🏥 = urgent care (appendicitis, kidney infection, DVT). Empty array [] if none.

KEY CONSTRAINTS:
- EXACTLY 3 items for causes, care, and doctor
- EXACTLY 2 items for tips
- Keep each item to ONE concise sentence (max ~15 words)
- Be specific: include numbers ("fever above 103°F", "persists beyond 3 days")
- Use plain English — explain medical terms in parentheses
- NEVER recommend prescription medications — OTC only
- matchedNames in plain lowercase English`;

  try {
    // 3. Forward the request to Groq securely
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
    
    // Parse to ensure validity before sending back to frontend
    const result = JSON.parse(content);
    
    // 4. Send the successful JSON back to the frontend
    return res.status(200).json(result);

  } catch (error) {
    console.error('SERVER ERROR:', error);
    return res.status(500).json({ error: 'Internal Server Error analyzing symptoms' });
  }
}
