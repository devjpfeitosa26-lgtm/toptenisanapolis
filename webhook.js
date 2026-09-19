export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { event, payment } = req.body;

  // Verifica se o evento é de pagamento confirmado
  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
    const paymentId = payment.id;
    const value = payment.value;
    const customerId = payment.customer;

    // TODO: Atualize o status do pedido no seu banco de dados (ex: Supabase, PostgreSQL)
    // ex: await updateOrderStatus(paymentId, 'PAID');

    console.log(`Pagamento do Pix ${paymentId} confirmado com sucesso!`);
  }

  // O Asaas exige status 200 de retorno para confirmar a entrega do webhook
  return res.status(200).json({ received: true });
}
