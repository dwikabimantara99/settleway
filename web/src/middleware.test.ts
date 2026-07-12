import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

describe('Demo Middleware', () => {
  it('sets mock_actor cookie to buyer for demo=1&role=buyer', () => {
    const req = new NextRequest('http://localhost:3000/deals/123?demo=1&role=buyer');
    const res = middleware(req);
    expect(res.cookies.get('mock_actor')?.value).toBe('buyer-surabaya-restaurant');
  });

  it('sets mock_actor cookie to seller for demo=1&role=seller', () => {
    const req = new NextRequest('http://localhost:3000/deals/123?demo=1&role=seller');
    const res = middleware(req);
    expect(res.cookies.get('mock_actor')?.value).toBe('seller-probolinggo-cabai');
  });

  it('does not set cookie for unknown role', () => {
    const req = new NextRequest('http://localhost:3000/deals/123?demo=1&role=unknown');
    const res = middleware(req);
    expect(res.cookies.get('mock_actor')).toBeUndefined();
  });

  it('does not set cookie for non-demo request', () => {
    const req = new NextRequest('http://localhost:3000/deals/123?role=buyer');
    const res = middleware(req);
    expect(res.cookies.get('mock_actor')).toBeUndefined();
  });
});
