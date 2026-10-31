import "server-only";
import type { Repositories } from "@/lib/db/repository";
import type { Dataset } from "./metrics";

/** Charge le périmètre de données d'UN commerce (isolation par merchantId). */
export async function loadDataset(repos: Repositories, merchantId: string): Promise<Dataset> {
  const [customers, cards, transactions, issuances, rewards, programs, stores] = await Promise.all([
    repos.customers.findMany({ merchantId }),
    repos.cards.findMany({ merchantId }),
    repos.transactions.findMany({ merchantId }),
    repos.issuances.findMany({ merchantId }),
    repos.rewards.findMany({ merchantId }),
    repos.programs.findMany({ merchantId }),
    repos.stores.findMany({ merchantId }),
  ]);
  return { customers, cards, transactions, issuances, rewards, programs, stores };
}
