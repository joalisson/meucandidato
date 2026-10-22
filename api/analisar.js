// api/analisar.js (Versão Blindada contra Erros da API)
export default async function handler(req, res) {
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
      return res.status(500).json({ error: 'Chave da API do Gemini não configurada nas variáveis de ambiente.' });
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
      console.error('Erro na resposta do Google:', data);
      return res.status(500).json({ error: 'Erro retornado pela API do Gemini.' });
    }

    // Verificações de segurança para evitar quebre de índice indefinido
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      console.error('A API do Gemini bloqueou ou retornou estrutura vazia:', JSON.stringify(data));
      return res.status(500).json({ error: 'A IA retornou uma resposta vazia ou bloqueada por filtros de segurança.' });
    }

    const rawText = data.candidates[0].content.parts[0].text;
    
    // Limpa eventuais marcações de markdown e faz o parse
    const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonResult = JSON.parse(cleanJsonText);

    return res.status(200).json(jsonResult);
  } catch (error) {
    console.error('Erro crítico na Serverless Function:', error);
    return res.status(500).json({ error: 'Falha interna ao processar com a IA: ' + error.message });
  }
}