import { NextResponse } from 'next/server';
import { requireDealParticipant } from '@/lib/auth/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { loadManagedCustodyConfig } from '@/lib/managed-custody/config';
import { prepareFundingTransaction } from '@/lib/managed-custody/operations';
import { StellarSdkRpc } from '@/lib/stellar/server/stellar-sdk-rpc';

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  try {
    const { deal, role } = await requireDealParticipant(dealId);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const actorAddress = typeof body.actor_address === 'string' ? body.actor_address.trim() : '';

    if (!actorAddress) {
      return NextResponse.json(createErrorResponse('BAD_REQUEST', 'actor_address is required.'), { status: 400 });
    }

    const config = loadManagedCustodyConfig();
    const rpcPort = new StellarSdkRpc(config.rpcUrl, config.networkPassphrase);

    const { unsignedXdr, expectedAmountXlm } = await prepareFundingTransaction({
      deal,
      role,
      sourceAddress: actorAddress,
      config,
      rpcPort
    });

    return NextResponse.json(createSuccessResponse({
      unsigned_xdr: unsignedXdr,
      expected_amount_xlm: expectedAmountXlm,
      network_passphrase: config.networkPassphrase,
    }, {
      source: 'managed-custody-testnet'
    }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('MANAGED_CUSTODY_FUND_FAILED', error instanceof Error ? error.message : String(error)),
      { status: 400 },
    );
  }
}
