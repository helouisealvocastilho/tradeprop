export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let messages;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    messages = body.messages;
  } catch(e) {
    return res.status(400).json({ error: 'Invalid body' });
  }

  const SYSTEM = `Você é o assistente do TradeProp.io — plataforma brasileira para traders de mesa proprietária de futuros. Tom: trader experiente falando com trader. Direto, sem enrolação, em português brasileiro.

REGRAS IMPORTANTES:
- Sempre use a ferramenta de busca para verificar regras atuais das prop firms antes de responder.
- Priorize sempre o site oficial de cada firm: apextraderfunding.com, bulenox.com, topstep.com, alphafutures.com, tradeify.co, takeprofittrader.com, tradefy.com.
- Nunca invente números ou regras. Se não encontrar, diga para verificar o site oficial.
- Responda sempre em português brasileiro.
- Máximo 5 parágrafos por resposta.
- Tom: trader falando com trader, direto ao ponto.

CONTEXTO BASE (use como referência, mas sempre confirme com busca):
- APEX 4.0 (março 2026): EOD ou Intraday trail, 4 tamanhos (25K/50K/100K/150K), fee única, consistência 50% na PA, mín 5 dias qualificados por payout, safety net = saldo inicial + drawdown + $100, máx 6 payouts por conta, split 100%, até 20 PAs.
- BULENOX: 3 etapas, Option1 (intraday) ou Option2 (EOD), consistência 40%, payout toda quarta mín $1000, primeiros $10k 100% depois 90/10, NinjaTrader grátis, suporta EAs.
- TOPSTEP: 1 etapa, intraday no Combine, consistência 50%, winning day mín $150, split 90/10, Live Funded, VPN proibida.
- TRADEIFY/LUCID: Flex Policy, conta Flex é das mais baratas para ativar, boa para iniciantes.
- Não existe firm certa para começar — existe a que melhor se adequa ao setup do trader.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: SYSTEM,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search'
          }
        ],
        messages
      })
    });

    const data = await response.json();

    if (data.error) return res.status(500).json({ reply: 'Erro API: ' + data.error.message });
    if (!data.content) return res.status(500).json({ reply: 'Resposta inesperada: ' + JSON.stringify(data) });

    // Extrai o texto da resposta (pode ter blocos de tool_use e text)
    const textBlock = data.content.find(block => block.type === 'text');
    
    if (textBlock) {
      return res.status(200).json({ reply: textBlock.text });
    }

    // Se não tem texto direto, pode ser que precisou de mais uma rodada com resultados da busca
    // Nesse caso retorna o que tiver
    const anyText = data.content.map(b => b.text || '').filter(Boolean).join('\n');
    if (anyText) return res.status(200).json({ reply: anyText });

    return res.status(200).json({ reply: 'Não consegui processar a resposta. Tente novamente.' });

  } catch(e) {
    return res.status(500).json({ reply: 'Erro: ' + e.message });
  }
}
