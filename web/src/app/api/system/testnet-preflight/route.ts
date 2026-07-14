import { NextResponse } from 'next/server';
import { loadDealRoomTestnetRuntime } from '@/lib/stellar/server/deal-room-testnet-runtime';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = loadDealRoomTestnetRuntime();

  if (!result.ok) {
    const missing = result.errors.map((e) => e.field);
    return NextResponse.json(
      {
        status: 'BLOCKED',
        missing,
      },
      { status: 503 } // 503 Service Unavailable since custody is blocked
    );
  }

  // Preflight successful
  return NextResponse.json(
    {
      status: 'READY',
      contract_id: result.runtime.contract_id,
      custody_contract_id: result.runtime.custody_contract_id,
      testnet_token_contract_id: result.runtime.testnet_token_contract_id,
    },
    { status: 200 }
  );
}
