// Removed temporary env diagnostics endpoint. Returning 410 Gone.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Gone' }, { status: 410 });
}
