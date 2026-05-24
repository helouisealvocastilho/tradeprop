export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { messages } = req.body;

  const SYSTEM = `Você é o assistente do TradeProp.io — plataforma brasileira para traders de mesa proprietária. Tom: trader falando com trader. Direto. Português brasileiro. APEX: 1 etapa, EOD ou Intraday drawdown, consistência 30%, payout mín 8 dias, split 90/10, fee única, até 20 contas. BULENOX: 3 etapas, Option1 ou Option2, consistência 40%, payout toda quarta mín $1000, primeiros $10k 100% depois 90/10, NinjaTrader grátis, EAs permitidos. TOPSTEP: 1 etapa, intraday no Combine, consistência 50%, winning day mín $150, split 90/10, Live Funded, VPN proibida. ALPHA FUTURES: Standard/Advanced/Zero, EOD trailing, Trustpilot 4.9. TRADEIFY: Intraday trailing, Flex Policy. TAKE PROFIT TRADER: Fee única, intraday trailing. TRADEFY: Jornalzinho diário de PnL. BLUE SKY: Em crescimento. Nunca invente números. Máx 5 parágrafos.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM,
      messages
    })
  });

  const data = await response.json();
  return res.status(200).json({ reply: data.content[0].text });
}
