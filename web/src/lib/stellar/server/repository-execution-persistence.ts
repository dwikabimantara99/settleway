import type { IRepository } from "@/lib/repositories";
import type { StellarOperation } from "@/lib/stellar/types";
import type {
  StellarOperationPersistencePort,
  StellarPersistenceWriteResult,
} from "./execution-service";
import type {
  StellarDealPersistencePort,
  StellarDealPersistenceWriteResult,
} from "./mock-store-deal-persistence";
import type { DbDeal } from "@/lib/db/types";

export class RepositoryStellarOperationPersistence
  implements StellarOperationPersistencePort
{
  constructor(private readonly repository: IRepository) {}

  async createPending(
    operation: StellarOperation,
  ): Promise<StellarPersistenceWriteResult> {
    if (operation.operation_status !== "pending") {
      return { ok: false, reason: "conflict" };
    }

    const result = await this.repository.createStellarOperation(operation);
    if (!result.created) {
      return { ok: false, reason: "conflict" };
    }

    return { ok: true };
  }

  async replaceIfCurrent(input: {
    current: StellarOperation;
    next: StellarOperation;
  }): Promise<StellarPersistenceWriteResult> {
    const result = await this.repository.replaceStellarOperationIfCurrent(input);
    if (!result.replaced) {
      return { ok: false, reason: "conflict" };
    }

    return { ok: true };
  }
}

export class RepositoryDealPersistence implements StellarDealPersistencePort {
  constructor(private readonly repository: IRepository) {}

  async replaceIfCurrent(input: {
    current: DbDeal;
    next: DbDeal;
  }): Promise<StellarDealPersistenceWriteResult> {
    const result = await this.repository.replaceDealIfCurrent(input);
    if (!result.replaced) {
      return { ok: false, reason: "conflict" };
    }

    return { ok: true };
  }
}
