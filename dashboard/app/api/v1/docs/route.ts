import { NextResponse } from 'next/server';
import { buildOpenApiSpec } from '@/lib/api-docs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const spec = buildOpenApiSpec();
  return NextResponse.json(spec, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
