/**
 * Servizio Tavily per ricerca web in tempo reale.
 *
 * SICUREZZA:
 * - Non usare MAI una API key Tavily nel client (anche offuscata è estraibile).
 * - La ricerca web live va fatta SOLO lato backend (TAVILY_API_KEY in env/secret manager),
 *   idealmente come parte del flusso /api/chat.
 */

export async function tavilySearch({ query, maxResults = 5, topic = 'general', searchDepth = 'advanced', timeRange }) {
  void query; void maxResults; void topic; void searchDepth; void timeRange;
  return {
    error: 'Ricerca web live disponibile solo via backend.',
    results: [],
  };
}
