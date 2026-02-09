/**
 * Servizio Tavily per ricerca web in tempo reale.
 * API Key: https://app.tavily.com → EXPO_PUBLIC_TAVILY_API_KEY in .env
 */
const TAVILY_URL = 'https://api.tavily.com/search';

export async function tavilySearch({ query, maxResults = 5, topic = 'general', searchDepth = 'advanced', timeRange }) {
  const apiKey = process.env.EXPO_PUBLIC_TAVILY_API_KEY?.trim();
  if (!apiKey) {
    return { error: 'Tavily API key non configurata', results: [] };
  }

  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        topic,
        search_depth: searchDepth,
        ...(timeRange && { time_range: timeRange }),
        include_answer: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[Tavily] Errore:', res.status, errText);
      return { error: `Tavily ${res.status}`, results: [] };
    }

    const data = await res.json();
    const results = data?.results || [];
    return { results, answer: data?.answer };
  } catch (e) {
    console.warn('[Tavily] Errore:', e);
    return { error: e?.message || 'Errore ricerca', results: [] };
  }
}
