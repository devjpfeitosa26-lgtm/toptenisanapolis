// Exemplo de Endpoint Serverless (Next.js / Node.js)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, cpfCnpj, email, value, description } = req.body;

  const ASAAS_URL = process.env.NODE_ENV === 'production' 
    ? 'https://api.asaas.com/v3' 
    : 'https://sandbox.asaas.com/v3';

  const headers = {
    'Content-Type': 'application/json',
    'access_token': process.env.ASAAS_API_KEY
  };

  try {
    // 1. Criar o Cliente no Asaas
    const customerRes = await fetch(`${ASAAS_URL}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, cpfCnpj, email })
    });
    const customer = await customerRes.json();

    if (!customer.id) throw new Error(customer.errors?.[0]?.description || 'Erro ao criar cliente');

    // 2. Criar a Cobrança PIX
    const paymentRes = await fetch(`${ASAAS_URL}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer: customer.id,
        billingType: 'PIX',
        value: Number(value),
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Expira em 24h
        description: description || 'Compra no site Top Tênis Anápolis'
      })
    });
    const payment = await paymentRes.json();

    // 3. Obter o QR Code e Código Copia e Cola
    const qrRes = await fetch(`${ASAAS_URL}/payments/${payment.id}/pixQrCode`, {
      method: 'GET',
      headers
    });
    const qrData = await qrRes.json();

    return res.status(200).json({
      paymentId: payment.id,
      encodedImage: qrData.encodedImage, // String Base64 da imagem do QR Code
      payload: qrData.payload,           // Código Pix Copia e Cola
      expirationDate: qrData.expirationDate
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
