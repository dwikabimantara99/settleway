import { NextResponse } from 'next/server';
import { requireDealParticipant } from '@/lib/auth/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { repository } from '@/lib/repositories';
import { loadCustodyV2PublicConfig } from '@/lib/custody-v2/config';
import { freezeCustodyV2Deal } from '@/lib/custody-v2/links';

function readString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function readUnix(body: Record<string, unknown>, key: string): number {
  const value = body[key];
  if (!Number.isInteger(value) || typeof value !== 'number') {
    throw new Error(`${key} must be a Unix-second integer.`);
  }
  return value;
}

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  try {
    const auth = await requireDealParticipant(dealId);
    if (auth.role !== 'buyer') {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Only the buyer may freeze the initial Custody V2 application corridor.'),
        { status: 403 },
      );
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const requiredEvidence = Array.isArray(body.required_evidence)
      ? body.required_evidence.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      : ['recent product photos', 'delivery proof', 'signed receipt'];
    const link = await freezeCustodyV2Deal({
      repository,
      config: loadCustodyV2PublicConfig(),
      deal: auth.deal,
      buyerAddress: readString(body, 'buyer_address'),
      sellerAddress: readString(body, 'seller_address'),
      mediatorAddress: readString(body, 'mediator_address'),
      principalBaseUnits: readString(body, 'principal_base_units'),
      buyerBondBaseUnits: readString(body, 'buyer_bond_base_units'),
      sellerBondBaseUnits: readString(body, 'seller_bond_base_units'),
      fundingDeadlineUnix: readUnix(body, 'funding_deadline_unix'),
      deliveryDeadlineUnix: readUnix(body, 'delivery_deadline_unix'),
      inspectionDeadlineUnix: readUnix(body, 'inspection_deadline_unix'),
      qualitySpecification: readString(body, 'quality_specification'),
      deliveryDestination: readString(body, 'delivery_destination'),
      requiredEvidence,
    });
    return NextResponse.json(createSuccessResponse(link, {
      source: 'custody-v2-testnet',
      immutable_terms: true,
    }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('CUSTODY_V2_FREEZE_TERMS_FAILED', error instanceof Error ? error.message : String(error)),
      { status: 400 },
    );
  }
}
