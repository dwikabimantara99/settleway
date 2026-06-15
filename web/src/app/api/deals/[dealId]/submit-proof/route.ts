import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/db/mock-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { verifyAndConstructEvidence } from '@/lib/evidence/verification';

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'submit_proof' as EscrowAction;

  try {
    const existingDeal = mockStore.deals.get(dealId);
    if (!existingDeal) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Deal not found'), { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';
    let actorId: string | null = null;
    let proofHash: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      actorId = formData.get('actor_id') as string;
      const file = formData.get('file') as File;
      const clientHash = formData.get('client_preview_hash') as string | null;

      if (!file) {
        return NextResponse.json(createErrorResponse('BAD_REQUEST', 'Missing file'), { status: 400 });
      }

      if (existingDeal.seller_id !== actorId) {
        return NextResponse.json(createErrorResponse('UNAUTHORIZED', 'Only seller can submit proof'), { status: 403 });
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

      mockStore.addEvidence(verifyRes.evidence!);
      proofHash = verifyRes.evidence!.sha256_hash;
    } else {
      // Fallback for json logic (from previous phase) if needed
      const body = await request.json().catch(() => ({}));
      if (body.actor_id) actorId = body.actor_id;
      if (body.proof_hash) proofHash = body.proof_hash;
    }

    const updatedDeal = transition(existingDeal, actionName);
    if (proofHash) {
      updatedDeal.proof_hash = proofHash;
    }
    mockStore.updateDeal(dealId, updatedDeal);
    
    // Add event
    const event = createEvent(dealId, actionName, actorId, 'Executed ' + actionName);
    mockStore.addEvent(event);

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
