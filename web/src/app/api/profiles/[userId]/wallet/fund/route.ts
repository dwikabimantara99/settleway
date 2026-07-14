import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getServerWalletRepository } from '@/lib/stellar/server/wallet-repository';
import { fundTestnetWalletViaFriendbot } from '@/lib/stellar/server/smoke/testnet-friendbot';
import { runtimeMode } from '@/lib/repositories';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    if (runtimeMode === 'persistent') {
      // In fully persistent mainnet/production modes without demo fallback, do not allow Friendbot
      if (process.env.NEXT_PUBLIC_RUNTIME_MODE !== 'demo') {
        return NextResponse.json({ error: 'Friendbot is disabled in this environment.' }, { status: 403 });
      }
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Only allow users to fund their own wallet
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Must be an approved demo actor if we are relying on demo escape hatch
    if (user.id !== 'buyer-surabaya-restaurant' && user.id !== 'seller-probolinggo-cabai') {
      return NextResponse.json({ error: 'Forbidden: only demo actors can use this endpoint.' }, { status: 403 });
    }

    const walletRepo = getServerWalletRepository();
    const wallet = await walletRepo.getProfileWallet(userId);

    if (!wallet) {
      return NextResponse.json({ error: 'Profile wallet not found.' }, { status: 404 });
    }

    const result = await fundTestnetWalletViaFriendbot(wallet.public_address);
    if (!result.ok) {
       return NextResponse.json({ error: result.message || 'Friendbot funding failed.' }, { status: 502 });
    }

    return NextResponse.json({ success: true, status: result.status, message: result.message });
  } catch (error) {
    console.error('API error funding wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
