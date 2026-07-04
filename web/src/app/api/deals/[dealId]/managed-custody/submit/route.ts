import { NextResponse } from 'next/server';
import { requireDealParticipant } from '@/lib/auth/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { repository } from '@/lib/repositories';
import { getServerAdminWriter } from '@/lib/repositories/admin-writer';
import { loadManagedCustodyConfig } from '@/lib/managed-custody/config';
import { StellarSdkRpc } from '@/lib/stellar/server/stellar-sdk-rpc';
import { transition, type EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  try {
    const { deal, role } = await requireDealParticipant(dealId);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const signedXdr = typeof body.signed_xdr === 'string' ? body.signed_xdr.trim() : '';

    if (!signedXdr) {
      return NextResponse.json(createErrorResponse('BAD_REQUEST', 'signed_xdr is required.'), { status: 400 });
    }

    const config = loadManagedCustodyConfig();
    const rpcPort = new StellarSdkRpc(config.rpcUrl, config.networkPassphrase);

    // Submit transaction
    const submitResult = await rpcPort.submitTransaction(signedXdr);
    
    if (!submitResult.ok) {
      throw new Error(`Failed to submit transaction: ${submitResult.status}`);
    }

    // Wait for confirmation
    const txHash = submitResult.transaction_hash!;
    // Polling for confirmation in a real app would be better done via a background job,
    // but for simplicity in this synchronous route we await the confirmation.
    // However, StellarSdkRpc.submitTransaction often already handles initial submission.
    // Let's rely on standard confirmation checks.
    
    // We should poll a few times for confirmation
    let confirmed = false;
    for (let i = 0; i < 10; i++) {
      const confirm = await rpcPort.confirmTransaction(txHash);
      if (confirm.outcome === 'confirmed') {
        confirmed = true;
        break;
      }
      if (confirm.outcome === 'failed') {
        let errMsg = 'Transaction failed on network.';
        if (confirm.result_xdr) {
          errMsg += ` Result XDR: ${confirm.result_xdr}`;
        }
        throw new Error(errMsg);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!confirmed) {
      throw new Error('Transaction confirmation timed out.');
    }

    // Update Deal Link status
    let custodyLink = await repository.getCustodyDealLink(dealId);
    
    if (!custodyLink) {
      // Create a managed custody link if it doesn't exist
      const { link } = await getServerAdminWriter().createCustodyDealLink({
        application_deal_id: dealId,
        rail_version: 'managed_custody_testnet',
        contract_id: config.custodyWalletPublicKey, // Use contract_id to store custody wallet
        contract_deal_id: dealId,
        terms_schema_version: 'settleway.terms.v1',
        terms_hash: 'managed',
        canonical_terms_json: '{}',
        canonical_terms_bytes_base64: '',
        frozen_at: new Date().toISOString(),
        buyer_address: role === 'buyer' ? 'managed' : 'managed', // We could extract from TX, but simplify for now
        seller_address: role === 'seller' ? 'managed' : 'managed',
        mediator_address: config.custodyWalletPublicKey,
        asset_contract_id: 'native',
        settlement_asset_label: 'XLM',
        principal_base_units: '0',
        buyer_bond_base_units: '0',
        seller_bond_base_units: '0',
        funding_deadline_unix: Math.floor(Date.now() / 1000) + (3 * 24 * 3600), // 3x24 timeout
        delivery_deadline_unix: 0,
        inspection_deadline_unix: 0,
        latest_contract_state: 'AwaitingFunding',
        latest_terminal_outcome: null,
        last_confirmed_ledger: null,
        last_reconciled_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      custodyLink = link;
    }

    const updates: Partial<typeof custodyLink> = {};
    if (role === 'buyer') {
      updates.buyer_funded_tx = txHash;
    } else {
      updates.seller_funded_tx = txHash;
    }

    // Check if both funded
    if (
      (role === 'buyer' && custodyLink.seller_funded_tx) ||
      (role === 'seller' && custodyLink.buyer_funded_tx)
    ) {
      updates.latest_contract_state = 'Active'; // Locked
    }

    await getServerAdminWriter().updateCustodyDealLink(dealId, updates);

    const actionName: EscrowAction = role === 'buyer' ? 'buyer_deposit' : 'seller_deposit';
    const nextDealState = transition(deal, actionName);
    
    await repository.updateDeal(dealId, {
      status: nextDealState.status,
      latest_stellar_tx_hash: txHash,
      updated_at: new Date().toISOString(),
    });

    await repository.addEvent(createEvent(
      dealId,
      actionName,
      role === 'buyer' ? deal.buyer_id : deal.seller_id,
      `Managed Custody testnet funding confirmed for ${role}.`
    ));

    return NextResponse.json(createSuccessResponse({
      transaction_hash: txHash,
      status: updates.latest_contract_state || custodyLink.latest_contract_state
    }, {
      source: 'managed-custody-testnet'
    }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('MANAGED_CUSTODY_SUBMIT_FAILED', error instanceof Error ? error.message : String(error)),
      { status: 400 },
    );
  }
}
