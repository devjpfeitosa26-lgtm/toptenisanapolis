// /api/asaas-pix-status.js
// Consulta o status de uma cobrança Pix no Asaas.
// Usado pelo navegador para saber quando o cliente pagou (polling a cada poucos segundos).

function baseUrlFor(apiKey) {
  return apiKey && apiKey.startsWith('$aact_hmlg_')
    ? 'https://api-sandbox.asaas.com/v3'
    : 'https://api.asaas.com/v3';
}

const STATUS_PAGO = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  const API_KEY = process.env.API_ASAAS;
  if (!API_KEY) {
    console.error('API_ASAAS não configurada nas variáveis de ambiente da Vercel.');
    return res.status(500).json({ error: 'Consulta de pagamento indisponível.' });
  }

  const id = req.query && req.query.id;
  if (!id) return res.status(400).json({ error: 'Parâmetro id é obrigatório.' });

  try {
    const resp = await fetch(`${baseUrlFor(API_KEY)}/payments/${id}`, {
      headers: {
        'access_token': API_KEY,
        'User-Agent': 'TopTenisAnapolis/1.0'
      }
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('Erro ao consultar pagamento no Asaas:', data);
      return res.status(502).json({ error: 'Não foi possível consultar o pagamento.' });
    }
    return res.status(200).json({ status: data.status, pago: STATUS_PAGO.includes(data.status) });
  } catch (err) {
    console.error('Erro inesperado ao consultar status Pix:', err);
    return res.status(500).json({ error: 'Erro interno ao consultar o pagamento.' });
  }
};
