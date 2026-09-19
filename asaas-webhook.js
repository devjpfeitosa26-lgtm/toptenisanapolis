// /api/asaas-webhook.js
// Recebe os eventos que o Asaas envia (ex.: PAYMENT_RECEIVED, PAYMENT_CONFIRMED).
// Aponte essa URL no painel do Asaas: https://SEU-SITE.vercel.app/api/asaas-webhook
//
// Hoje a confirmação que o cliente vê no site vem do polling em /api/asaas-pix-status,
// que não depende deste webhook. Este endpoint fica pronto para você evoluir depois
// (ex.: mandar uma notificação automática para a loja, gravar o pedido em um banco de
// dados, etc.) sem precisar mexer no fluxo do cliente.

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  // Se você configurou um "Token de acesso" ao criar o webhook no painel do Asaas,
  // salve o mesmo valor na variável de ambiente ASAAS_WEBHOOK_TOKEN na Vercel.
  // O Asaas reenvia esse token no header abaixo em toda chamada.
  const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
  const tokenRecebido = req.headers['asaas-access-token'];
  if (tokenEsperado && tokenRecebido !== tokenEsperado) {
    console.warn('Webhook Asaas: token de acesso não confere.');
    return res.status(401).json({ error: 'Token inválido.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    const evento = body && body.event;
    const pagamento = body && body.payment;
    console.log('Webhook Asaas recebido:', evento, pagamento && pagamento.id, pagamento && pagamento.status);

    // Exemplo de extensão futura:
    // if (evento === 'PAYMENT_RECEIVED' || evento === 'PAYMENT_CONFIRMED') {
    //   // notificar a loja, atualizar um pedido salvo em banco, etc.
    // }
  } catch (err) {
    console.error('Erro ao processar webhook Asaas:', err);
  }

  // Sempre responder 200 rapidamente, senão o Asaas fica reenviando o evento.
  return res.status(200).json({ ok: true });
};
