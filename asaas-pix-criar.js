// /api/asaas-pix-criar.js
// Cria (ou reaproveita) um cliente no Asaas e gera uma cobrança Pix,
// devolvendo o QR Code e o código "copia e cola" para o navegador.
// A chave de API (API_ASAAS) fica só aqui no servidor — nunca no front-end.

function baseUrlFor(apiKey) {
  // Detecta o ambiente pelo prefixo da própria chave:
  // $aact_hmlg_...  -> sandbox   |   $aact_prod_...  -> produção
  return apiKey && apiKey.startsWith('$aact_hmlg_')
    ? 'https://api-sandbox.asaas.com/v3'
    : 'https://api.asaas.com/v3';
}

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

function isValidCpf(cpfRaw) {
  const cpf = onlyDigits(cpfRaw);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.charAt(i - 1), 10) * (11 - i);
  rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.charAt(9), 10)) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.charAt(i - 1), 10) * (12 - i);
  rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(cpf.charAt(10), 10);
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const API_KEY = process.env.API_ASAAS;
  if (!API_KEY) {
    console.error('API_ASAAS não configurada nas variáveis de ambiente da Vercel.');
    return res.status(500).json({ error: 'Pagamento por Pix está temporariamente indisponível.' });
  }

  const BASE = baseUrlFor(API_KEY);
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'TopTenisAnapolis/1.0',
    'access_token': API_KEY
  };

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    const { nome, cpf, telefone, bairro, itens, total } = body || {};

    if (!nome || String(nome).trim().length < 3) {
      return res.status(400).json({ error: 'Informe o nome completo.' });
    }
    if (!isValidCpf(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Confira e tente novamente.' });
    }
    if (!Array.isArray(itens) || !itens.length) {
      return res.status(400).json({ error: 'Sacola vazia.' });
    }
    const value = Math.round(Number(total) * 100) / 100;
    if (!value || value <= 0) {
      return res.status(400).json({ error: 'Valor do pedido inválido.' });
    }

    const cpfDigits = onlyDigits(cpf);
    const phoneDigits = onlyDigits(telefone);

    // 1) Encontrar cliente existente pelo CPF ou criar um novo
    let customerId;
    const searchResp = await fetch(`${BASE}/customers?cpfCnpj=${cpfDigits}`, { headers });
    const searchData = await searchResp.json();

    if (searchResp.ok && Array.isArray(searchData.data) && searchData.data.length) {
      customerId = searchData.data[0].id;
    } else {
      const createResp = await fetch(`${BASE}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: nome,
          cpfCnpj: cpfDigits,
          mobilePhone: phoneDigits || undefined
        })
      });
      const createData = await createResp.json();
      if (!createResp.ok) {
        console.error('Erro ao criar cliente no Asaas:', createData);
        return res.status(502).json({ error: 'Não foi possível cadastrar seus dados. Tente novamente.' });
      }
      customerId = createData.id;
    }

    // 2) Montar a cobrança
    const descricaoItens = itens
      .map(i => `${i.qty}x ${i.nome} (nº ${i.tamanho})`)
      .join(', ')
      .slice(0, 400);
    const dueDate = new Date().toISOString().slice(0, 10); // cobrança do dia (Pix imediato)

    const paymentResp = await fetch(`${BASE}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value,
        dueDate,
        description: `Pedido Top Tênis Anápolis — ${descricaoItens} — Bairro: ${bairro || '-'}`,
        externalReference: `toptenis-${Date.now()}`
      })
    });
    const paymentData = await paymentResp.json();
    if (!paymentResp.ok) {
      console.error('Erro ao criar cobrança Pix no Asaas:', paymentData);
      return res.status(502).json({ error: 'Não foi possível gerar a cobrança Pix. Tente novamente.' });
    }

    // 3) Buscar a imagem do QR Code e o "copia e cola"
    const qrResp = await fetch(`${BASE}/payments/${paymentData.id}/pixQrCode`, { headers });
    const qrData = await qrResp.json();
    if (!qrResp.ok) {
      console.error('Erro ao obter QR Code Pix:', qrData);
      return res.status(502).json({ error: 'Não foi possível gerar o QR Code. Tente novamente.' });
    }

    return res.status(200).json({
      paymentId: paymentData.id,
      qrCodeBase64: qrData.encodedImage,
      copiaECola: qrData.payload,
      expirationDate: qrData.expirationDate,
      value
    });
  } catch (err) {
    console.error('Erro inesperado ao gerar Pix:', err);
    return res.status(500).json({ error: 'Erro interno ao gerar o Pix. Tente novamente.' });
  }
};
