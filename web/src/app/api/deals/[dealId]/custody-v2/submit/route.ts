import { NextResponse } from 'next/server';
import { requireDealParticipant } from '@/lib/auth/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { repository } from '@/lib/repositories';
import { getServerAdminWriter } from '@/lib/repositories/admin-writer';
import { loadCustodyV2ServerConfig } from '@/lib/custody-v2/config';
import { verifySignedCustodyV2Envelope } from '@/lib/custody-v2/operations';
import { StellarSdkRpc } from '@/lib/stellar/server/stellar-sdk-rpc';

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  try {
    await requireDealParticipant(dealId);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const idempotencyKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : '';
    const signedXdr = typeof body.signed_xdr === 'string' ? body.signed_xdr.trim() : '';

    if (!idempotencyKey || !signedXdr) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'idempotency_key and signed_xdr are required.'),
        { status: 400 },
      );
    }

    const operation = await repository.getCustodyOperation(idempotencyKey);
    if (!operation || operation.application_deal_id !== dealId) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', 'Prepared Custody V2 operation was not found.'),
        { status: 404 },
      );
    }
    if (operation.status !== 'prepared') {
      return NextResponse.json(createSuccessResponse(operation, {
        source: 'custody-v2-testnet',
        reused_existing_operation: true,
      }));
    }
    if (new Date(operation.prepared_expires_at).getTime() <= Date.now()) {
      await getServerAdminWriter().updateCustodyOperation(idempotencyKey, {
        status: 'expired',
        failure_code: 'PREPARED_TRANSACTION_EXPIRED',
      });
      return NextResponse.json(
        createErrorResponse('CUSTODY_V2_OPERATION_EXPIRED', 'Prepared Custody V2 transaction expired before submission.'),
        { status: 400 },
      );
    }

    const config = loadCustodyV2ServerConfig();
    verifySignedCustodyV2Envelope({
      signedXdr,
      preparedOperation: operation,
      networkPassphrase: config.networkPassphrase,
      expectedSigner: operation.actor_address,
    });

    const rpcPort = new StellarSdkRpc(config.rpcUrl, config.networkPassphrase);
    const submitted = await rpcPort.submitTransaction(signedXdr);
    if (submitted.ok || submitted.status === 'duplicate') {
      const updated = await getServerAdminWriter().updateCustodyOperation(idempotencyKey, {
        status: 'submitted',
        transaction_hash: submitted.transaction_hash,
        rpc_result_category: submitted.ok ? 'pending' : 'duplicate',
      });
      return NextResponse.json(createSuccessResponse(updated, {
        source: 'custody-v2-testnet',
        transaction_hash: submitted.transaction_hash,
        confirmation_status: 'pending',
      }), { status: 202 });
    }

    const failed = await getServerAdminWriter().updateCustodyOperation(idempotencyKey, {
      status: 'failed',
      failure_code: submitted.status === 'rejected' ? submitted.error_code : submitted.status,
      rpc_result_category: submitted.status,
    });
    return NextResponse.json(
      createErrorResponse('CUSTODY_V2_SUBMIT_FAILED', failed?.failure_code ?? 'Custody V2 submission failed.'),
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('CUSTODY_V2_SUBMIT_FAILED', error instanceof Error ? error.message : String(error)),
      { status: 400 },
    );
  }
}

