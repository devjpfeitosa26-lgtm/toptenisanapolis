// /api/check-status.js (ou .ts)
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query; // ID do pagamento recebido na criação do Pix

  if (!id) return res.status(400).json({ error: 'ID do pagamento não fornecido' });

  const ASAAS_URL = process.env.NODE_ENV === 'production' 
    ? 'https://api.asaas.com/v3' 
    : 'https://sandbox.asaas.com/v3';

  try {
    const response = await fetch(`${ASAAS_URL}/payments/${id}`, {
      method: 'GET',
      headers: {
        'access_token': process.env.ASAAS_API_KEY
      }
    });

    const payment = await response.json();

    // Retorna se está PENDING, RECEIVED, CONFIRMED, etc.
    return res.status(200).json({ status: payment.status });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
