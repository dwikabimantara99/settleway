import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fundTestnetWalletViaFriendbot } from './testnet-friendbot';

describe('fundTestnetWalletViaFriendbot', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects non-G public address without calling fetch', async () => {
    const res = await fundTestnetWalletViaFriendbot('INVALID_ADDRESS');
    expect(res.ok).toBe(false);
    expect(res.redactedAddress).toBe('INVALID');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects address shorter than 56 characters without calling fetch', async () => {
    const res = await fundTestnetWalletViaFriendbot('GSHORT123');
    expect(res.ok).toBe(false);
    expect(res.redactedAddress).toBe('INVALID');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('never accepts or returns secret fields', async () => {
    // Secret seeds start with 'S'
    const secret = 'SA234567890123456789012345678901234567890123456789012345';
    const res = await fundTestnetWalletViaFriendbot(secret);
    expect(res.ok).toBe(false);
    expect(res.redactedAddress).toBe('INVALID');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns success and redacted address on fetch success', async () => {
    const pubKey = 'GDW7TF4E7VD43DNURUXIGV7S62N5CB2LWQNCBYRZVZXULWRVKRS4MOSB';
    // @ts-expect-error Mocking global fetch
    fetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const res = await fundTestnetWalletViaFriendbot(pubKey);
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.redactedAddress).toBe('GDW7T...MOSB');
    expect(fetch).toHaveBeenCalledWith(`https://friendbot.stellar.org/?addr=${pubKey}`);
  });

  it('handles already funded wallet gracefully (op_already_exists)', async () => {
    const pubKey = 'GDW7TF4E7VD43DNURUXIGV7S62N5CB2LWQNCBYRZVZXULWRVKRS4MOSB';
    // @ts-expect-error Mocking global fetch
    fetch.mockResolvedValueOnce({ 
      ok: false, 
      status: 400, 
      text: () => Promise.resolve('Error op_already_exists')
    });

    const res = await fundTestnetWalletViaFriendbot(pubKey);
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.message).toBe('Already funded');
  });

  it('retries once and then fails gracefully', async () => {
    const pubKey = 'GDW7TF4E7VD43DNURUXIGV7S62N5CB2LWQNCBYRZVZXULWRVKRS4MOSB';
    // @ts-expect-error Mocking global fetch
    fetch.mockResolvedValue({ 
      ok: false, 
      status: 500, 
      text: () => Promise.resolve('Internal Server Error')
    });

    // Mock setTimeout to speed up the test
    vi.useFakeTimers();
    const promise = fundTestnetWalletViaFriendbot(pubKey);
    await vi.advanceTimersByTimeAsync(2000);
    const res = await promise;
    vi.useRealTimers();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);
    expect(res.message).toContain('Friendbot rejected or failed after 2 attempts: Internal Server Error');
  });
});
