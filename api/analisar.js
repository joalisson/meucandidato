// api/analisar.js (Vercel Serverless Function)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { income, region, topics } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chave da API do Gemini não configurada.' });
  }

  const prompt = `
Atue como um analista socioeconômico imparcial sobre a realidade política e econômica do Brasil.
Analise o impacto real e os efeitos colaterais das propostas de Flávio Bolsonaro (PL) e Luiz Inácio Lula da Silva (PT) para o seguinte perfil do eleitor:
- Renda Mensal: R$ ${income}
- Região do Brasil: ${region}
- Temas Prioritários Selecionados: ${topics.join(', ')}

Sua resposta DEVE ser estritamente em formato JSON válido (sem textos antes ou depois, e sem marcações markdown de bloco de código json), seguindo exatamente esta estrutura:
{
  "flavioPercent": (número inteiro de 0 a 100 indicando a fatia proporcional de benefício para o perfil),
  "lulaPercent": (número inteiro de 0 a 100 tal que flavioPercent + lulaPercent = 100),
  "flavioSummary": "(Resumo conciso de 2 frases sobre o impacto geral do Flávio para essa renda/região)",
  "lulaSummary": "(Resumo conciso de 2 frases sobre o impacto geral do Lula para essa renda/região)",
  "details": [
    {
      "topicKey": "(nome do tema)",
      "topicTitle": "(título do tema)",
      "flavioTitle": "(resumo da proposta do Flávio)",
      "flavioSideEffect": "(análise detalhada dos riscos e efeitos colaterais do Flávio para a Renda de R$ ${income})",
      "lulaTitle": "(resumo da proposta do Lula)",
      "lulaSideEffect": "(análise detalhada dos riscos e efeitos colaterais do Lula para a Renda de R$ ${income})"
    }
  ]
}
`;

  try {
    const response = await fetch(
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

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const jsonResult = JSON.parse(rawText);

    return res.status(200).json(jsonResult);
  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).json({ error: 'Falha ao processar análise via IA.' });
  }
}