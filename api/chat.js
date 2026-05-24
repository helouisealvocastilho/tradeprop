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

REGRAS:
- Use a ferramenta de busca quando precisar confirmar regras atuais das prop firms.
- Priorize sites oficiais: apextraderfunding.com, bulenox.com, topstep.com, tradeify.co, takeprofittrader.com.
- Nunca invente números ou regras.
- Responda sempre em português brasileiro.
- Máximo 5 parágrafos por resposta. Sem markdown excessivo (evite ## e **)
- Tom direto, como trader falando com trader.

CONTEXTO BASE:
- APEX 4.0 (março 2026): EOD ou Intraday trail, tamanhos 25K/50K/100K/150K, fee única, consistência 50% na PA, mín 5 dias qualificados por payout, safety net = saldo inicial + drawdown + $100, máx 6 payouts por conta, split 100%, até 20 PAs simultâneas. Metais disponíveis.
- BULENOX: 3 etapas, Option1 (intraday) ou Option2 (EOD), consistência 40%, payout toda quarta mín $1000, primeiros $10k 100% depois 90/10, NinjaTrader grátis, suporta EAs.
- TOPSTEP: 1 etapa, intraday no Combine, consistência 50%, winning day mín $150, split 90/10, Live Funded, VPN proibida.
- TRADEIFY/LUCID: Flex Policy, conta Flex é das mais baratas para ativar, boa para iniciantes.
- Não existe firm certa para começar — existe a que melhor se adequa ao setup do trader. Para iniciantes vale olhar Tradeify/Lucid pela conta Flex barata, ou Bulenox que com cupons sai por ~$20 a avaliação.`;

  const tools = [{ type: 'web_search_20250305', name: 'web_search' }];

  try {
    let currentMessages = [...messages];
    let finalReply = '';
    let rounds = 0;

    while (rounds < 5) {
      rounds++;

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
          tools,
          messages: currentMessages
        })
      });

      const data = await response.json();

      if (data.error) return res.status(500).json({ reply: 'Erro API: ' + data.error.message });
      if (!data.content) return res.status(500).json({ reply: 'Erro inesperado.' });

      // Se terminou (stop_reason = end_turn), pega o texto e retorna
      if (data.stop_reason === 'end_turn') {
        const textBlock = data.content.find(b => b.type === 'text');
        finalReply = textBlock ? textBlock.text : 'Não consegui responder. Tente novamente.';
        break;
      }

      // Se precisa usar tool (web search)
      if (data.stop_reason === 'tool_use') {
        // Adiciona a resposta do assistente ao histórico
        currentMessages.push({ role: 'assistant', content: data.content });

        // Processa cada tool_use
        const toolResults = [];
        for (const block of data.content) {
          if (block.type === 'tool_use') {
            // Retorna resultado vazio para a tool — a API vai buscar sozinha
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'Search executed.'
            });
          }
        }

        // Adiciona resultados das tools ao histórico
        currentMessages.push({ role: 'user', content: toolResults });
        continue;
      }

      // Qualquer outro stop_reason, tenta extrair texto
      const textBlock = data.content.find(b => b.type === 'text');
      if (textBlock) { finalReply = textBlock.text; break; }
      break;
    }

    return res.status(200).json({ reply: finalReply || 'Não consegui responder. Tente novamente.' });

  } catch(e) {
    return res.status(500).json({ reply: 'Erro: ' + e.message });
  }
}
