import { NextResponse } from 'next/server';
import { requireDealParticipant } from '@/lib/auth/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { repository } from '@/lib/repositories';
import { getServerAdminWriter } from '@/lib/repositories/admin-writer';
import { loadCustodyV2ServerConfig } from '@/lib/custody-v2/config';
import { StellarCustodyV2ContractReader } from '@/lib/custody-v2/contract-reader';
import { applyChainCustodyProjection } from '@/lib/custody-v2/projection';
import { StellarSdkRpc } from '@/lib/stellar/server/stellar-sdk-rpc';
import type { CustodyV2ServerConfig } from '@/lib/custody-v2/config';

function scValBytesTopicMatches(topic: unknown, expectedHex: string): boolean {
  if (!Array.isArray(topic)) return false;
  return topic.some((entry) => {
    if (typeof entry !== 'string') return false;
    try {
      const bytes = Buffer.from(entry, 'base64');
      if (bytes.length < 40) return false;
      const discriminant = bytes.subarray(0, 4).toString('hex');
      const length = bytes.readUInt32BE(4);
      if (discriminant !== '0000000d' || length !== 32) return false;
      return bytes.subarray(8, 40).toString('hex') === expectedHex;
    } catch {
      return false;
    }
  });
}

async function transactionHasContractDealEvent(input: {
  config: CustodyV2ServerConfig;
  transactionHash: string;
  contractDealId: string;
  ledger: number | null;
}) {
  if (!input.ledger) return false;
  const requestBody = {
    jsonrpc: '2.0',
    id: 1,
    method: 'getEvents',
    params: {
      startLedger: input.ledger,
      pagination: { limit: 200 },
      filters: [{
        type: 'contract',
        contractIds: [input.config.contractId],
      }],
    },
  };

  const response = await fetch(input.config.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) return false;
  const payload = await response.json() as {
    result?: {
      events?: Array<{
        contractId?: string;
        txHash?: string;
        inSuccessfulContractCall?: boolean;
        topic?: unknown;
      }>;
    };
  };
  return (payload.result?.events ?? []).some((event) => (
    event.contractId === input.config.contractId &&
    event.txHash === input.transactionHash &&
    event.inSuccessfulContractCall === true &&
    scValBytesTopicMatches(event.topic, input.contractDealId)
  ));
}

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
      const failed = await getServerAdminWriter().updateCustodyOperation(idempotencyKey, {
        status: 'failed',
        failure_code: 'CONTRACT_TRANSACTION_FAILED',
        rpc_result_category: 'failed',
      });
      return NextResponse.json(
        createErrorResponse('CUSTODY_V2_TRANSACTION_FAILED', failed?.failure_code ?? 'Custody V2 transaction failed on Stellar.'),
        { status: 400 },
      );
    }

    const reader = new StellarCustodyV2ContractReader(config);
    const chainDeal = await reader.getDeal(operation.actor_address, operation.contract_deal_id);
    if (!chainDeal.ok) {
      if (chainDeal.error_code === 'not_found') {
        const hasDealEvent = await transactionHasContractDealEvent({
          config,
          transactionHash: operation.transaction_hash,
          contractDealId: operation.contract_deal_id,
          ledger: confirmation.ledger,
        });
        if (hasDealEvent) {
          const confirmedOperation = await getServerAdminWriter().updateCustodyOperation(idempotencyKey, {
            status: 'confirmed',
            rpc_result_category: 'confirmed',
            confirmed_ledger: confirmation.ledger,
          });
          if (!confirmedOperation) throw new Error('Custody V2 event confirmation update failed.');
          const link = await repository.getCustodyDealLink(dealId);
          return NextResponse.json(createSuccessResponse({ operation: confirmedOperation, link }, {
            source: 'custody-v2-testnet',
            confirmation_status: 'confirmed',
            projection_source: 'contract_event_fallback',
            message: 'The Stellar transaction is confirmed and the Deal Room will continue from the recorded contract event.',
          }));
        }
        return NextResponse.json(createSuccessResponse(operation, {
          source: 'custody-v2-testnet',
          confirmation_status: 'confirmed_waiting_for_contract_state',
          message: 'The Stellar transaction was accepted and Settleway is waiting for the protected deal record to become readable.',
        }), { status: 202 });
      }
      return NextResponse.json(
        createErrorResponse(
          'CUSTODY_V2_CHAIN_RECONCILIATION_FAILED',
          'Settleway could not verify the protected deal state on Stellar yet. Refresh and retry reconciliation.',
        ),
        { status: chainDeal.error_code === 'rpc_error' ? 503 : 409 },
      );
    }
    const confirmedOperation = await getServerAdminWriter().updateCustodyOperation(idempotencyKey, {
      status: 'confirmed',
      rpc_result_category: 'confirmed',
      confirmed_ledger: confirmation.ledger ?? chainDeal.latestLedger ?? null,
    });
    if (!confirmedOperation) throw new Error('Custody V2 confirmation update failed.');
    const link = await applyChainCustodyProjection({
      repository,
      adminWriter: getServerAdminWriter(),
      applicationDealId: dealId,
      chainDeal: chainDeal.value,
      confirmedLedger: confirmation.ledger ?? chainDeal.latestLedger,
    });

    return NextResponse.json(createSuccessResponse({ operation: confirmedOperation, link }, {
      source: 'custody-v2-testnet',
      confirmation_status: 'confirmed',
      projection_source: 'direct_contract_get_deal',
    }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('CUSTODY_V2_CONFIRM_FAILED', error instanceof Error ? error.message : String(error)),
      { status: 400 },
    );
  }
}

