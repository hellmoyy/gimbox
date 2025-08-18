export async function GET() {
  const cfg = {
    baseUrl: (process.env.VCGAMERS_BASE_URL || '').trim() || (process.env.VCGAMERS_SANDBOX === 'true' ? 'https://sandbox-api.vcgamers.com' : 'https://api.vcgamers.com'),
    priceListPath: (process.env.VCGAMERS_PRICELIST_PATH || '/v1/pricelist').trim(),
    balancePath: (process.env.VCGAMERS_BALANCE_PATH || '/v1/balance').trim(),
    sandbox: process.env.VCGAMERS_SANDBOX === 'true',
    hasKey: !!(process.env.VCGAMERS_API_KEY),
    hasSecret: !!(process.env.VCGAMERS_SECRET_KEY),
  };
  return Response.json({ success: true, data: cfg });
}
