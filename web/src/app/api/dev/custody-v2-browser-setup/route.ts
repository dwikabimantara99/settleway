import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import {
  createFounderBrowserCustodyDeal,
  diagnoseCustodyV2BrowserRuntime,
  resolveCustodyV2BrowserRole,
} from '@/lib/custody-v2/browser-corridor';
import { repository, runtimeMode } from '@/lib/repositories';

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  const diagnostics = diagnoseCustodyV2BrowserRuntime(process.env, runtimeMode, process.env.NODE_ENV);
  if (!diagnostics.setupAllowed) {
    return NextResponse.json(
      createErrorResponse('FOUNDER_BROWSER_SETUP_UNAVAILABLE', 'Founder browser setup is not available in this runtime.'),
      { status: 404 },
    );
  }
  if (!diagnostics.ok) {
    return NextResponse.json(
      createErrorResponse('CUSTODY_V2_RUNTIME_NOT_READY', diagnostics.errors.join(' ')),
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const buyerAddress = readString(body.buyer_address);
    const sellerAddress = readString(body.seller_address);
    const { deal, link } = await createFounderBrowserCustodyDeal({
      repository,
      buyerAddress,
      sellerAddress,
    });
    const origin = request.nextUrl.origin;
    const buyerRole = resolveCustodyV2BrowserRole(link, buyerAddress);
    const sellerRole = resolveCustodyV2BrowserRole(link, sellerAddress);

    return NextResponse.json(
      createSuccessResponse(
        {
          deal_id: deal.id,
          deal_room_url: `${origin}/deals/${deal.id}`,
          buyer_profile_id: deal.buyer_id,
          seller_profile_id: deal.seller_id,
          buyer_address: link.buyer_address,
          seller_address: link.seller_address,
          buyer_role_match: buyerRole,
          seller_role_match: sellerRole,
          contract_id: link.contract_id,
          settlement_asset: `${link.settlement_asset_label} native SAC on Stellar Testnet`,
          asset_contract_id: link.asset_contract_id,
          terms_hash: link.terms_hash,
          contract_deal_id: link.contract_deal_id,
        },
        { source: 'custody-v2-founder-browser-setup' },
      ),
    );
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(
        'FOUNDER_BROWSER_SETUP_FAILED',
        error instanceof Error ? error.message : String(error),
      ),
      { status: 400 },
    );
  }
}
