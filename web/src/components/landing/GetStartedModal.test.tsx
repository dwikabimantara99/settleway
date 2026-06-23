import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createRef } from 'react';
import { GetStartedModal } from './GetStartedModal';

describe('GetStartedModal', () => {
  it('renders the authentication-choice dialog content when open', () => {
    const html = renderToString(
      <GetStartedModal
        isOpen
        onClose={() => {}}
        returnFocusRef={createRef<HTMLButtonElement>()}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Enter Settleway');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('Connect Stellar Wallet');
    expect(html).toContain('Protected by design');
  });

  it('keeps the provider buttons and legal text visible without fabricating routes', () => {
    const html = renderToString(
      <GetStartedModal
        isOpen
        onClose={() => {}}
        returnFocusRef={createRef<HTMLButtonElement>()}
      />,
    );

    expect(html).toContain('By continuing, you agree to our');
    expect(html).toContain('Terms of Service');
    expect(html).toContain('Privacy Policy');
    expect(html).toContain('type="button"');
  });
});
