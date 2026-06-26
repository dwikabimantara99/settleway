import { NextResponse } from 'next/server';
import { requireDealParticipant } from '@/lib/auth/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { repository } from '@/lib/repositories';
import type { CustodyV2ActionType } from '@/lib/db/types';
import { loadCustodyV2ServerConfig } from '@/lib/custody-v2/config';
import { StellarCustodyV2ContractReader } from '@/lib/custody-v2/contract-reader';
import { prepareCustodyV2Operation } from '@/lib/custody-v2/operations';
import { StellarSdkRpc } from '@/lib/stellar/server/stellar-sdk-rpc';

function isCustodyAction(value: unknown): value is CustodyV2ActionType {
  return value === 'CREATE_DEAL' ||
    value === 'ACCEPT_TERMS' ||
    value === 'FUND_BUYER' ||
    value === 'FUND_SELLER' ||
    value === 'SUBMIT_EVIDENCE' ||
    value === 'ACCEPT_DELIVERY' ||
    value === 'EXPIRE_FUNDING';
}

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  try {
    await requireDealParticipant(dealId);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const actionType = body.action_type;
    const actorAddress = typeof body.actor_address === 'string' ? body.actor_address.trim() : '';
    const evidenceHash = typeof body.evidence_hash === 'string' ? body.evidence_hash.trim() : undefined;

    if (!isCustodyAction(actionType)) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'action_type is not supported for Custody V2.'),
        { status: 400 },
      );
    }

    const config = loadCustodyV2ServerConfig();
    const rpcPort = new StellarSdkRpc(config.rpcUrl, config.networkPassphrase);
    const contractReader = new StellarCustodyV2ContractReader(config);
    const prepared = await prepareCustodyV2Operation({
      repository,
      rpcPort,
      config,
      contractReader,
      applicationDealId: dealId,
      actionType,
      actorAddress,
      evidenceHash,
    });

    return NextResponse.json(createSuccessResponse(prepared, {
      source: 'custody-v2-testnet',
      confirmation_required: true,
    }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('CUSTODY_V2_PREPARE_FAILED', error instanceof Error ? error.message : String(error)),
      { status: 400 },
    );
  }
}
