// api/analisar.js (Versão com Endpoint do Gemini Atualizado)
export default async function handler(req, res) {
  // Configurações de CORS para requisições do frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { income, region, topics } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada na Vercel.' });
    }

    const prompt = `
Atue como um analista socioeconômico imparcial sobre a realidade política e econômica do Brasil.
Analise o impacto real e os efeitos colaterais das propostas de Flávio Bolsonaro (PL) e Luiz Inácio Lula da Silva (PT) para o seguinte perfil do eleitor:
- Renda Mensal: R$ ${income || '4.000,00'}
- Região do Brasil: ${region || 'Sudeste'}
- Temas Prioritários Selecionados: ${(topics || []).join(', ')}

Sua resposta DEVE ser estritamente em formato JSON válido (sem textos antes ou depois, e sem marcações markdown de bloco de código json), seguindo exatamente esta estrutura:
{
  "flavioPercent": 50,
  "lulaPercent": 50,
  "flavioSummary": "Resumo conciso de 2 frases sobre o impacto geral do Flávio.",
  "lulaSummary": "Resumo conciso de 2 frases sobre o impacto geral do Lula.",
  "details": [
    {
      "topicKey": "saude",
      "topicTitle": "Saúde Pública & SUS",
      "flavioTitle": "Parcerias Privadas",
      "flavioSideEffect": "Análise detalhada dos riscos e efeitos colaterais do Flávio.",
      "lulaTitle": "SUS Público",
      "lulaSideEffect": "Análise detalhada dos riscos e efeitos colaterais do Lula."
    }
  ]
}
`;

    // Endpoint atualizado utilizando a família de modelos Gemini Flash ativos
    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('Erro retornado pela API do Google:', data);
      return res.status(500).json({ error: data.error?.message || 'Erro de comunicação com a API do Gemini.' });
    }

    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      return res.status(500).json({ error: 'A IA não retornou um conteúdo válido para este perfil.' });
    }

    const rawText = data.candidates[0].content.parts[0].text;
    
    // Tratamento para garantir a limpeza de eventuais marcadores markdown
    const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonResult = JSON.parse(cleanJsonText);

    return res.status(200).json(jsonResult);
  } catch (error) {
    console.error('Erro na Serverless Function:', error);
    return res.status(500).json({ error: 'Falha interna no servidor: ' + error.message });
  }
}