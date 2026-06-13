import type { StellarOperation } from "@/lib/stellar/types";
import type {
  StellarOperationPersistencePort,
  StellarPersistenceWriteResult,
} from "./execution-service";
import type { MockStore } from "@/lib/db/mock-store";

export class MockStoreStellarOperationPersistence
  implements StellarOperationPersistencePort
{
  private readonly store: MockStore;

  constructor(store: MockStore) {
    this.store = store;
  }

  async createPending(
    operation: StellarOperation,
  ): Promise<StellarPersistenceWriteResult> {
    if (operation.operation_status !== "pending") {
      return { ok: false, reason: "conflict" };
    }
    const result = this.store.createStellarOperation(operation);
    if (!result.created) {
      return { ok: false, reason: "conflict" };
    }
    return { ok: true };
  }

  async replaceIfCurrent(input: {
    current: StellarOperation;
    next: StellarOperation;
  }): Promise<StellarPersistenceWriteResult> {
    const result = this.store.replaceStellarOperationIfCurrent(input);
    if (!result.replaced) {
      return { ok: false, reason: "conflict" };
    }
    return { ok: true };
  }
}
