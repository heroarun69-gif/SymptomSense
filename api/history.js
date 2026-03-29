export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  // Debug — tell us exactly what's happening
  if (!supabaseUrl) return res.status(500).json({ error: 'SUPABASE_URL is missing' });
  if (!supabaseKey) return res.status(500).json({ error: 'SUPABASE_ANON_KEY is missing' });

  try {
    const url = `${supabaseUrl}/rest/v1/symptom_history?email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=20`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    const text = await response.text();
    
    if (!response.ok) {
      return res.status(500).json({ error: 'Supabase error', status: response.status, body: text });
    }

    const data = JSON.parse(text);
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
