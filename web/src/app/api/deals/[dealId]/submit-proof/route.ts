import { NextResponse } from 'next/server';
import { repository, runtimeMode } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import type { DbDeal } from '@/lib/db/types';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { verifyAndConstructEvidence } from '@/lib/evidence/verification';
import {
  loadDealRoomTestnetRuntime,
  type DealRoomTestnetRuntime,
} from '@/lib/stellar/server/deal-room-testnet-runtime';
import { executeConfirmedDealRoomRouteAction } from '@/lib/stellar/server/deal-room-route-execution';
import { executeCustodyProofReference } from '@/lib/stellar/testnet-proof';

async function runLegacyLocalProofSubmission(
  dealId: string,
  existingDeal: DbDeal,
  actorId: string,
  proofHash: string | null,
  evidenceMetadata:
    | {
        evidence_id: string;
        original_filename: string;
        byte_size: number;
        evidence_kind: string;
      }
    | null,
) {
  const updatedDeal = transition(existingDeal, 'submit_proof');
  if (proofHash) {
    updatedDeal.proof_hash = proofHash;
  }
  const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
  if (!replaced) return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });

  const event = createEvent(
    dealId,
    'submit_proof',
    actorId,
    'Seller submitted delivery proof for verification and timeline recording.',
    {
      next_status: updatedDeal.status,
      ...evidenceMetadata,
    },
  );
  event.proof_hash = proofHash;
  await repository.addEvent(event);

  return NextResponse.json(createSuccessResponse(updatedDeal));
}

async function persistCustodyWalletProofSubmission(input: {
  dealId: string;
  existingDeal: DbDeal;
  actorId: string;
  proofHash: string;
  transactionHash: string;
  custodyAddress: string;
  proofDataKey: string;
  evidenceMetadata:
    | {
        evidence_id: string;
        original_filename: string;
        byte_size: number;
        evidence_kind: string;
      }
    | null;
}) {
  const nextDeal = {
    ...transition(input.existingDeal, 'submit_proof'),
    proof_hash: input.proofHash,
    latest_stellar_tx_hash: input.transactionHash,
    stellar_sync_status: 'idle' as const,
  };

  const replaced = await repository.replaceDealIfCurrent({
    current: input.existingDeal,
    next: nextDeal,
  });

  let updatedDeal = replaced.deal ?? nextDeal;
  if (!replaced.replaced) {
    const currentDeal = await repository.getDeal(input.existingDeal.id);
    if (
      currentDeal?.status === 'PROOF_SUBMITTED' &&
      currentDeal.proof_hash === input.proofHash &&
      currentDeal.latest_stellar_tx_hash === input.transactionHash
    ) {
      updatedDeal = currentDeal;
    } else if (
      runtimeMode === 'demo' &&
      currentDeal &&
      JSON.stringify(currentDeal) === JSON.stringify(input.existingDeal)
    ) {
      await repository.updateDeal(input.existingDeal.id, {
        status: nextDeal.status,
        proof_hash: nextDeal.proof_hash,
        latest_stellar_tx_hash: nextDeal.latest_stellar_tx_hash,
        stellar_sync_status: nextDeal.stellar_sync_status,
        updated_at: nextDeal.updated_at,
      });
      const recoveredDeal = await repository.getDeal(input.existingDeal.id);
      if (!recoveredDeal) {
        return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
      }
      updatedDeal = recoveredDeal;
    } else {
      return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
    }
  }

  const existingEvents = await repository.getDealEvents(input.dealId);
  const hasProofEvent = existingEvents.some(
    (event) =>
      event.event_type === 'submit_proof' &&
      event.proof_hash === input.proofHash &&
      event.tx_hash === input.transactionHash,
  );

  if (!hasProofEvent) {
    const event = createEvent(
      input.dealId,
      'submit_proof',
      input.actorId,
      'Seller submitted delivery proof and Settleway recorded the SHA-256 proof reference through the custody wallet on Stellar Testnet.',
      {
        next_status: updatedDeal.status,
        proof_recording_route: 'settleway_custody_wallet_memo_hash',
        custody_address: input.custodyAddress,
        proof_data_key: input.proofDataKey,
        lock_transaction_hash: input.existingDeal.latest_stellar_tx_hash,
        ...input.evidenceMetadata,
      },
    );
    event.proof_hash = input.proofHash;
    event.tx_hash = input.transactionHash;
    await repository.addEvent(event);
  }

  return NextResponse.json(createSuccessResponse(updatedDeal));
}

async function runCustodyWalletProofSubmission(input: {
  dealId: string;
  existingDeal: DbDeal;
  actorId: string;
  proofHash: string;
  evidenceMetadata:
    | {
        evidence_id: string;
        original_filename: string;
        byte_size: number;
        evidence_kind: string;
      }
    | null;
  runtime: DealRoomTestnetRuntime;
}) {
  if (input.existingDeal.status !== 'LOCKED' || !input.existingDeal.latest_stellar_tx_hash) {
    return NextResponse.json(
      createErrorResponse(
        'STELLAR_EXECUTION_INVALID',
        'Proof submission requires a locked custody room with a confirmed lock transaction.',
      ),
      { status: 400 },
    );
  }

  const existingEvents = await repository.getDealEvents(input.dealId);
  const existingProofEvent = existingEvents.find(
    (event) =>
      event.event_type === 'submit_proof' &&
      event.proof_hash === input.proofHash &&
      event.tx_hash,
  );

  if (existingProofEvent?.tx_hash) {
    return persistCustodyWalletProofSubmission({
      dealId: input.dealId,
      existingDeal: input.existingDeal,
      actorId: input.actorId,
      proofHash: input.proofHash,
      transactionHash: existingProofEvent.tx_hash,
      custodyAddress: String(existingProofEvent.metadata?.custody_address ?? input.runtime.metadata.admin_address),
      proofDataKey: String(existingProofEvent.metadata?.proof_data_key ?? `SWP:${input.dealId.slice(-20)}`),
      evidenceMetadata: input.evidenceMetadata,
    });
  }

  let proofReference;
  try {
    proofReference = await executeCustodyProofReference({
      deal: input.existingDeal,
      proofHash: input.proofHash,
      signer: input.runtime.signer_port,
      custodyAddress: input.runtime.metadata.admin_address,
    });
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(
        'STELLAR_EXECUTION_FAILED',
        error instanceof Error
          ? error.message
          : 'The Stellar Testnet proof reference could not be confirmed.',
      ),
      { status: 502 },
    );
  }

  return persistCustodyWalletProofSubmission({
    dealId: input.dealId,
    existingDeal: input.existingDeal,
    actorId: input.actorId,
    proofHash: input.proofHash,
    transactionHash: proofReference.transactionHash,
    custodyAddress: proofReference.custodyAddress,
    proofDataKey: proofReference.proofDataKey,
    evidenceMetadata: input.evidenceMetadata,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'submit_proof' as EscrowAction;

  try {
    let existingDeal;
    let userRole;
    let authUser;
    try {
      const auth = await requireDealParticipant(dealId);
      existingDeal = auth.deal;
      userRole = auth.role;
      authUser = auth.user;
    } catch (e: unknown) {
      return NextResponse.json(createErrorResponse('UNAUTHORIZED', (e instanceof Error ? e.message : String(e))), { status: 401 });
    }
    if (userRole !== 'seller') return NextResponse.json(createErrorResponse('UNAUTHORIZED', 'Only seller can perform this action'), { status: 403 });

    const contentType = request.headers.get('content-type') || '';
    let actorId: string | null = null;
    let proofHash: string | null = null;
    let evidenceMetadata:
      | {
          evidence_id: string;
          original_filename: string;
          byte_size: number;
          evidence_kind: string;
        }
      | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      actorId = authUser.id;
      const file = formData.get('file') as File;
      const clientHash = formData.get('client_preview_hash') as string | null;

      if (!file) {
        return NextResponse.json(createErrorResponse('BAD_REQUEST', 'Missing file'), { status: 400 });
      }

      

      const buffer = Buffer.from(await file.arrayBuffer());

      const verifyRes = await verifyAndConstructEvidence({
        deal_id: dealId,
        submitted_by: actorId,
        evidence_kind: 'delivery_proof',
        original_filename: file.name,
        mime_type: file.type,
        display_visibility: 'deal_only',
        client_preview_hash: clientHash || undefined
      }, buffer, () => globalThis.crypto.randomUUID());

      if (!verifyRes.ok) {
        return NextResponse.json(createErrorResponse('BAD_REQUEST', verifyRes.error || 'Verification failed'), { status: 400 });
      }

      await repository.addEvidence(verifyRes.evidence!);
      proofHash = verifyRes.evidence!.sha256_hash;
      evidenceMetadata = {
        evidence_id: verifyRes.evidence!.id,
        original_filename: verifyRes.evidence!.original_filename,
        byte_size: verifyRes.evidence!.byte_size,
        evidence_kind: verifyRes.evidence!.evidence_kind,
      };
    } else {
      // Fallback for json logic (from previous phase) if needed
      const body = await request.json().catch(() => ({}));
      actorId = authUser.id;
      if (body.proof_hash) proofHash = body.proof_hash;
    }

    if (!proofHash) {
      return NextResponse.json(createErrorResponse('BAD_REQUEST', 'Proof hash is required before submitting proof'), { status: 400 });
    }

    if (existingDeal.stellar_mode !== 'testnet') {
      return runLegacyLocalProofSubmission(dealId, existingDeal, actorId, proofHash, evidenceMetadata);
    }

    const runtimeLoaded = loadDealRoomTestnetRuntime();
    if (!runtimeLoaded.ok) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_RUNTIME_UNAVAILABLE',
          'Proof submission is configured for Stellar Testnet, but the local runtime is not ready.',
        ),
        { status: 503 },
      );
    }

    if (existingDeal.stellar_escrow_id === null) {
      return runCustodyWalletProofSubmission({
        dealId,
        existingDeal,
        actorId,
        proofHash,
        evidenceMetadata,
        runtime: runtimeLoaded.runtime,
      });
    }

    const executionResult = await executeConfirmedDealRoomRouteAction({
      action: 'submit_proof',
      action_label: 'proof submission',
      deal: existingDeal,
      runtime: runtimeLoaded.runtime,
      proof_hash: proofHash,
    });
    if (!executionResult.ok) {
      return NextResponse.json(
        createErrorResponse(executionResult.failure.code, executionResult.failure.message),
        { status: executionResult.failure.status },
      );
    }

    let updatedDeal = executionResult.deal;
    if (updatedDeal.proof_hash !== proofHash) {
      const nextDeal = {
        ...updatedDeal,
        proof_hash: proofHash,
        updated_at: new Date().toISOString(),
      };
      const { replaced } = await repository.replaceDealIfCurrent({
        current: updatedDeal,
        next: nextDeal,
      });
      if (!replaced) {
        return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
      }
      updatedDeal = nextDeal;
    }

    const event = createEvent(
      dealId,
      actionName,
      actorId,
      'Seller submitted delivery proof through the protected Testnet-backed room path.',
      {
        next_status: updatedDeal.status,
        contract_id: runtimeLoaded.runtime.contract_id,
        actor_address: runtimeLoaded.runtime.metadata.seller_demo_address,
        ...evidenceMetadata,
      },
    );
    event.proof_hash = proofHash;
    event.tx_hash = executionResult.operation.transaction_hash;
    await repository.addEvent(event);

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
