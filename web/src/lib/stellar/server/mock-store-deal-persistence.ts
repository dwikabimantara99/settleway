import type { DbDeal } from "../../db/types";
import type { MockStore } from "../../db/mock-store";

export type StellarDealPersistenceFailureReason =
  | "conflict"
  | "unavailable";

export type StellarDealPersistenceWriteResult =
  | { ok: true }
  | {
      ok: false;
      reason: StellarDealPersistenceFailureReason;
    };

export interface StellarDealPersistencePort {
  replaceIfCurrent(input: {
    current: DbDeal;
    next: DbDeal;
  }): Promise<StellarDealPersistenceWriteResult>;
}

export class MockStoreDealPersistence implements StellarDealPersistencePort {
  constructor(private readonly store: MockStore) {}

  async replaceIfCurrent(input: {
    current: DbDeal;
    next: DbDeal;
  }): Promise<StellarDealPersistenceWriteResult> {
    const res = this.store.replaceDealIfCurrent(input);
    if (!res.replaced) {
      return { ok: false, reason: "conflict" };
    }
    return { ok: true };
  }
}
