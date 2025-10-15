import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasOpenFacturaMurallaKey: !!process.env.OPENFACTURA_API_KEY_MURALLA,
    hasOpenFacturaMurallitaKey: !!process.env.OPENFACTURA_API_KEY_MURALLITA,
    murallaKeyPrefix: process.env.OPENFACTURA_API_KEY_MURALLA?.substring(0, 8) + '...',
    murallitaKeyPrefix: process.env.OPENFACTURA_API_KEY_MURALLITA?.substring(0, 8) + '...',
  });
}
