import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DemoResetController } from './reset-controller';

describe('DemoResetController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('initializes in idle state', () => {
    const onStateChange = vi.fn();
    const controller = new DemoResetController(onStateChange);
    
    expect(controller.status).toBe('idle');
    expect(controller.loading).toBe(false);
    expect(controller.errorMessage).toBe('');
  });

  it('handles successful reset', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as unknown);

    const onStateChange = vi.fn();
    const controller = new DemoResetController(onStateChange);

    const promise = controller.handleReset();
    
    // Pending state
    expect(controller.loading).toBe(true);
    expect(controller.status).toBe('idle');
    expect(onStateChange).toHaveBeenCalledTimes(1);

    await promise;

    // Success state
    expect(controller.loading).toBe(false);
    expect(controller.status).toBe('success');
    expect(controller.errorMessage).toBe('');
    expect(onStateChange).toHaveBeenCalledTimes(2);
  });

  it('prevents duplicate requests while pending', async () => {
    let resolveFetch: (value: unknown) => void;
    global.fetch = vi.fn().mockReturnValue(new Promise((resolve) => {
      resolveFetch = resolve;
    }));

    const onStateChange = vi.fn();
    const controller = new DemoResetController(onStateChange);

    // Fire first
    const p1 = controller.handleReset();
    
    // Fire second
    const p2 = controller.handleReset();

    expect(global.fetch).toHaveBeenCalledTimes(1); // Only 1 fetch
    
    resolveFetch!({
      ok: true,
      json: async () => ({}),
    });

    await Promise.all([p1, p2]);
  });

  it('handles failure correctly and allows retry', async () => {
    // First call fails
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Demo mode not enabled' } }),
    } as unknown).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as unknown);

    const onStateChange = vi.fn();
    const controller = new DemoResetController(onStateChange);

    await controller.handleReset();

    // Error state
    expect(controller.status).toBe('error');
    expect(controller.errorMessage).toBe('Demo mode not enabled');
    expect(controller.loading).toBe(false);

    // Retry call succeeds
    await controller.handleReset();

    // Success state clears error
    expect(controller.status).toBe('success');
    expect(controller.errorMessage).toBe('');
    expect(controller.loading).toBe(false);
  });
});
