/**
 * Contrat d'accès aux données. Les services métier ne dépendent que de cette
 * interface : l'implémentation démo (mémoire + fichier JSON) peut être remplacée
 * par une implémentation Supabase (voir src/lib/db/supabase/README.md).
 */
import type { DemoDatabase } from "@/types/domain";

export type TableName = Exclude<keyof DemoDatabase, "version" | "seededAt">;
export type RowOf<T extends TableName> = DemoDatabase[T][number];

export interface Table<T> {
  findById(id: string): Promise<T | null>;
  /** Filtre par égalité stricte sur les champs fournis (équivalent `.match()` Supabase). */
  findMany(filter?: Partial<T>): Promise<T[]>;
  findOne(filter: Partial<T>): Promise<T | null>;
  count(filter?: Partial<T>): Promise<number>;
  insert(row: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface Repositories {
  merchants: Table<RowOf<"merchants">>;
  stores: Table<RowOf<"stores">>;
  users: Table<RowOf<"users">>;
  programs: Table<RowOf<"programs">>;
  rewards: Table<RowOf<"rewards">>;
  customers: Table<RowOf<"customers">>;
  cards: Table<RowOf<"cards">>;
  transactions: Table<RowOf<"transactions">>;
  issuances: Table<RowOf<"issuances">>;
  campaigns: Table<RowOf<"campaigns">>;
  automations: Table<RowOf<"automations">>;
  messageLogs: Table<RowOf<"messageLogs">>;
  subscriptions: Table<RowOf<"subscriptions">>;
  invoices: Table<RowOf<"invoices">>;
  auditLogs: Table<RowOf<"auditLogs">>;
  consentLogs: Table<RowOf<"consentLogs">>;
  tickets: Table<RowOf<"tickets">>;
  /** Exécute plusieurs écritures comme une unité (persistée une seule fois). */
  tx<R>(fn: () => Promise<R>): Promise<R>;
  /** Verrou applicatif sérialisant les opérations sensibles (ex : une carte). */
  withLock<R>(key: string, fn: () => Promise<R>): Promise<R>;
  meta(): { seededAt: string; version: number };
}
