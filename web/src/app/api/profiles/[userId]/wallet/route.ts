import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getServerWalletRepository } from '@/lib/stellar/server/wallet-repository';
import { generateAndEncryptProfileWallet } from '@/lib/stellar/server/provisioning';
import type { UserWallet } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Only allow users to access their own wallet
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const walletRepo = getServerWalletRepository();
    let wallet = await walletRepo.getProfileWallet(userId);

    // Idempotent provisioning if no wallet exists
    if (!wallet) {
      try {
        const newWallet = generateAndEncryptProfileWallet(userId);
        await walletRepo.provisionProfileWallet(newWallet);
        wallet = await walletRepo.getProfileWallet(userId);
      } catch (err) {
        console.error('Wallet provisioning error:', err);
        return NextResponse.json(
          { error: 'Failed to provision wallet. Configuration may be missing.' },
          { status: 500 }
        );
      }
    }

    if (!wallet) {
      return NextResponse.json({ error: 'Failed to retrieve wallet after provisioning' }, { status: 500 });
    }

    // Explicit mapping to safe UserWallet DTO (never exposing secret key)
    const publicWallet: UserWallet = {
      userId: wallet.user_id,
      publicAddress: wallet.public_address,
      status: wallet.status,
      createdAt: wallet.created_at,
    };

    return NextResponse.json(publicWallet);
  } catch (error) {
    console.error('API error retrieving wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
