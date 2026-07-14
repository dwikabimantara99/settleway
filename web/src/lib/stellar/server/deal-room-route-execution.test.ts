import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mapCoordinatorFailure, CUSTODY_ACTION_MAP, resolveCustodyAction } from './deal-room-route-execution';

describe('mapCoordinatorFailure Diagnostics Safety', () => {
  const originalEnv = process.env.SETTLEWAY_DEBUG_DEPOSIT_FAILURES;

  afterEach(() => {
    process.env.SETTLEWAY_DEBUG_DEPOSIT_FAILURES = originalEnv;
  });

  it('does not expose diagnostics by default', () => {
    delete process.env.SETTLEWAY_DEBUG_DEPOSIT_FAILURES;
    const result = mapCoordinatorFailure({
      ok: false,
      reason: 'ERR_EXECUTION_SERVICE_FAILURE',
      inner_result: { ok: false, error_code: 'ERR_UNKNOWN', some_unsafe_key: 'secret' }
    }, 'test action');
    
    expect(result.diagnostic).toBeUndefined();
  });

  it('exposes safe diagnostics only when SETTLEWAY_DEBUG_DEPOSIT_FAILURES=1', () => {
    process.env.SETTLEWAY_DEBUG_DEPOSIT_FAILURES = '1';
    const result = mapCoordinatorFailure({
      ok: false,
      reason: 'ERR_EXECUTION_SERVICE_FAILURE',
      inner_result: { 
        ok: false, 
        stage: 'operation', 
        error_code: 'ERR_TEST',
        private_key: 'S123',
        encrypted_secret_key: 'eyJhbGci',
        reason: 'some reason'
      }
    }, 'test action');
    
    expect(result.diagnostic).toBeDefined();
    expect(result.diagnostic?.stage).toBe('operation');
    expect(result.diagnostic?.error_code).toBe('ERR_TEST');
    expect(result.diagnostic?.reason).toBe('some reason');
    
    // Proving rule 3
    expect(result.diagnostic?.private_key).toBeUndefined();
    expect(result.diagnostic?.encrypted_secret_key).toBeUndefined();
  });

  it('maps known existing failed operation to specific fail-closed message', () => {
    process.env.SETTLEWAY_DEBUG_DEPOSIT_FAILURES = '1';
    const result = mapCoordinatorFailure({
      ok: false,
      reason: 'ERR_EXECUTION_SERVICE_FAILURE',
      inner_result: { 
        ok: false, 
        stage: 'planning', 
        failure: {
          ok: false,
          stage: 'operation',
          error_code: 'ERR_EXISTING_OPERATION_FAILED',
          public_error_code: 'ERR_CONTRACT_REJECTED'
        }
      }
    }, 'buyer deposit');
    
    expect(result.status).toBe(400);
    expect(result.code).toBe('STELLAR_EXECUTION_INVALID');
    expect(result.message).toContain('previously rejected by the escrow contract');
  });

  it('maps known escrow bootstrap failure to specific safe error', () => {
    process.env.SETTLEWAY_DEBUG_DEPOSIT_FAILURES = '1';
    const result = mapCoordinatorFailure({
      ok: false,
      reason: 'ERR_EXECUTION_SERVICE_FAILURE',
      inner_result: 'Escrow bootstrap completed without a persisted escrow id.'
    }, 'buyer deposit');
    
    expect(result.status).toBe(502);
    expect(result.code).toBe('STELLAR_EXECUTION_FAILED');
    expect(result.message).toContain('escrow room bootstrap failed');
  });
});

describe('CUSTODY_ACTION_MAP', () => {
  it('should map submit_proof to submit_proof_custody', () => {
    expect(CUSTODY_ACTION_MAP['submit_proof']).toBe('submit_proof_custody');
    expect(resolveCustodyAction('submit_proof')).toBe('submit_proof_custody');
  });

  it('should map mark_delivered to mark_delivered_custody', () => {
    expect(CUSTODY_ACTION_MAP['mark_delivered']).toBe('mark_delivered_custody');
    expect(resolveCustodyAction('mark_delivered')).toBe('mark_delivered_custody');
  });

  it('should map accept_delivery to accept_delivery_custody', () => {
    expect(CUSTODY_ACTION_MAP['accept_delivery']).toBe('accept_delivery_custody');
    expect(resolveCustodyAction('accept_delivery')).toBe('accept_delivery_custody');
  });

  it('should map expire to expire_custody', () => {
    expect(CUSTODY_ACTION_MAP['expire']).toBe('expire_custody');
    expect(resolveCustodyAction('expire')).toBe('expire_custody');
  });

  it('should map refund to refund_custody', () => {
    expect(CUSTODY_ACTION_MAP['refund']).toBe('refund_custody');
    expect(resolveCustodyAction('refund')).toBe('refund_custody');
  });

  it('should fail closed (return null) for unknown actions', () => {
    // We cast to unknown to bypass TS for the test
    expect(resolveCustodyAction('unknown_action' as any)).toBeNull();
  });
});
