export async function GET() {
  // TODO: Implement actual Digiflazz balance check via API
  return Response.json({ success: false, message: "Balance API belum diimplementasikan" }, { status: 501 });
}
