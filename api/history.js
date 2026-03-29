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

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/symptom_history?email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=20`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('History error:', error);
    return res.status(500).json({ error: 'Could not fetch history' });
  }
}
