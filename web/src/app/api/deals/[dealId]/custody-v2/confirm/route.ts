import { NextResponse } from 'next/server';
import { requireDealParticipant } from '@/lib/auth/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { repository } from '@/lib/repositories';
import { loadCustodyV2ServerConfig } from '@/lib/custody-v2/config';
import { applyConfirmedCustodyProjection } from '@/lib/custody-v2/projection';
import { StellarSdkRpc } from '@/lib/stellar/server/stellar-sdk-rpc';

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  try {
    await requireDealParticipant(dealId);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const idempotencyKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : '';
    if (!idempotencyKey) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'idempotency_key is required.'),
        { status: 400 },
      );
    }

    const operation = await repository.getCustodyOperation(idempotencyKey);
    if (!operation || operation.application_deal_id !== dealId) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', 'Custody V2 operation was not found.'),
        { status: 404 },
      );
    }
    if (!operation.transaction_hash) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'Custody V2 operation has not been submitted yet.'),
        { status: 400 },
      );
    }
    if (operation.status === 'confirmed') {
      const link = await repository.getCustodyDealLink(dealId);
      return NextResponse.json(createSuccessResponse({ operation, link }, {
        source: 'custody-v2-testnet',
        reused_existing_confirmation: true,
      }));
    }

    const config = loadCustodyV2ServerConfig();
    const rpcPort = new StellarSdkRpc(config.rpcUrl, config.networkPassphrase);
    const confirmation = await rpcPort.confirmTransaction(operation.transaction_hash);
    if (confirmation.outcome === 'not_found') {
      return NextResponse.json(createSuccessResponse(operation, {
        source: 'custody-v2-testnet',
        confirmation_status: 'pending',
      }), { status: 202 });
    }
    if (confirmation.outcome === 'error') {
      return NextResponse.json(
        createErrorResponse('CUSTODY_V2_CONFIRM_UNAVAILABLE', 'Stellar RPC confirmation is temporarily unavailable.'),
        { status: 503 },
      );
    }
    if (confirmation.outcome === 'failed') {
      const failed = await repository.updateCustodyOperation(idempotencyKey, {
        status: 'failed',
        failure_code: 'CONTRACT_TRANSACTION_FAILED',
        rpc_result_category: 'failed',
      });
      return NextResponse.json(
        createErrorResponse('CUSTODY_V2_TRANSACTION_FAILED', failed?.failure_code ?? 'Custody V2 transaction failed on Stellar.'),
        { status: 400 },
      );
    }

    const confirmedOperation = await repository.updateCustodyOperation(idempotencyKey, {
      status: 'confirmed',
      rpc_result_category: 'confirmed',
      confirmed_ledger: null,
    });
    if (!confirmedOperation) throw new Error('Custody V2 confirmation update failed.');
    const link = await applyConfirmedCustodyProjection({
      repository,
      operation: confirmedOperation,
    });

    return NextResponse.json(createSuccessResponse({ operation: confirmedOperation, link }, {
      source: 'custody-v2-testnet',
      confirmation_status: 'confirmed',
      projection_source: 'confirmed_transaction_and_contract_action_mapping',
    }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('CUSTODY_V2_CONFIRM_FAILED', error instanceof Error ? error.message : String(error)),
      { status: 400 },
    );
  }
}
