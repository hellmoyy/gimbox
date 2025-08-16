export async function GET() {
  return Response.json({ sandbox: process.env.VCGAMERS_SANDBOX === "true" });
}
