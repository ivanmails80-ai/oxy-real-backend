import 'dotenv/config';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY non trovata nel .env');
  process.exit(1);
}

console.log('🔑 Testando chiave OpenAI...');
console.log('Chiave (primissimi caratteri):', apiKey.substring(0, 20) + '...');

async function testOpenAIKey() {
  try {
    // Test 1: Verifica della chiave con una richiesta leggera
    const listModelsRes = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    console.log('\n📡 Risposta da OpenAI (list models):');
    console.log('Status:', listModelsRes.status);

    if (listModelsRes.status === 401) {
      console.error('❌ ERRORE 401: Chiave non valida o scaduta');
      return false;
    }

    if (listModelsRes.status === 429) {
      console.error('❌ ERRORE 429: Rate limit OpenAI raggiunto');
      return false;
    }

    if (!listModelsRes.ok) {
      const errorText = await listModelsRes.text();
      console.error('❌ Errore:', listModelsRes.status, errorText.slice(0, 200));
      return false;
    }

    const data = await listModelsRes.json();
    console.log('✅ Chiave VALIDA! Modelli disponibili:', data.data?.length || 0);

    // Test 2: Verifica crediti con una chiamata chat leggera
    console.log('\n📡 Testando chat API...');
    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Rispondi con una parola sola.' }],
        max_tokens: 10,
      }),
    });

    console.log('Status chat:', chatRes.status);

    if (chatRes.status === 401) {
      console.error('❌ ERRORE 401 su chat: Chiave non valida o scaduta');
      return false;
    }

    if (chatRes.status === 429) {
      console.error('❌ ERRORE 429: Rate limit OpenAI');
      return false;
    }

    if (chatRes.status === 400) {
      const errData = await chatRes.json();
      if (errData?.error?.code === 'insufficient_quota') {
        console.error('❌ CREDITI ESAURITI: Nessun credito disponibile sulla chiave OpenAI');
        return false;
      }
    }

    if (!chatRes.ok) {
      const errorText = await chatRes.text();
      console.error('❌ Errore chat:', chatRes.status, errorText.slice(0, 200));
      return false;
    }

    const chatData = await chatRes.json();
    console.log('✅ Chat API funzionante!');
    console.log('Risposta:', chatData.choices?.[0]?.message?.content);
    return true;

  } catch (e) {
    console.error('❌ Errore durante il test:', e.message);
    return false;
  }
}

testOpenAIKey().then(success => {
  process.exit(success ? 0 : 1);
});
