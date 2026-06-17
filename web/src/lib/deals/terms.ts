import type { DbDealTerms, DealActivationSource } from '@/lib/db/types';

const DEFAULT_DEPOSIT_WINDOW_HOURS = 24;

export function buildActiveRoomDealTerms(input: {
  offerId: string;
  activatedAt: string;
  depositWindowHours?: number;
  activationSource?: DealActivationSource;
}): DbDealTerms {
  const depositWindowHours =
    typeof input.depositWindowHours === 'number' && input.depositWindowHours > 0
      ? input.depositWindowHours
      : DEFAULT_DEPOSIT_WINDOW_HOURS;

  return {
    activation_source: input.activationSource ?? 'mutual_open_deal_room',
    offer_id: input.offerId,
    deposit_window_hours: depositWindowHours,
    deposit_deadline_at: new Date(
      new Date(input.activatedAt).getTime() + depositWindowHours * 60 * 60 * 1000,
    ).toISOString(),
    activated_at: input.activatedAt,
  };
}

export function getDealActivationSource(terms: DbDealTerms): DealActivationSource | null {
  return terms.activation_source ?? null;
}

export function getDealOfferId(terms: DbDealTerms): string | null {
  return typeof terms.offer_id === 'string' && terms.offer_id.length > 0 ? terms.offer_id : null;
}

export function getDealDepositWindowHours(terms: DbDealTerms): number {
  return typeof terms.deposit_window_hours === 'number' && terms.deposit_window_hours > 0
    ? terms.deposit_window_hours
    : DEFAULT_DEPOSIT_WINDOW_HOURS;
}

export function getDealDepositDeadlineAt(input: {
  terms: DbDealTerms;
  createdAt: string;
}): string {
  if (
    typeof input.terms.deposit_deadline_at === 'string' &&
    input.terms.deposit_deadline_at.length > 0
  ) {
    return input.terms.deposit_deadline_at;
  }

  const depositWindowHours = getDealDepositWindowHours(input.terms);
  return new Date(
    new Date(input.createdAt).getTime() + depositWindowHours * 60 * 60 * 1000,
  ).toISOString();
}

export function getDealActivatedAt(terms: DbDealTerms): string | null {
  return typeof terms.activated_at === 'string' && terms.activated_at.length > 0
    ? terms.activated_at
    : null;
}
