import "server-only";
import fs from "fs";
import path from "path";
import { env } from "@/config/env";
import type { DemoDatabase } from "@/types/domain";
import type { Repositories, Table, TableName } from "./repository";
import { buildSeed, SEED_VERSION } from "@/lib/demo/seed";

/**
 * Implémentation « démo » des repositories : base en mémoire, persistée dans
 * DEMO_DATA_DIR/db.json. Aucune dépendance réseau.
 */

type Holder = { db: DemoDatabase | null; locks: Map<string, Promise<unknown>>; txDepth: number; dirty: boolean };
const g = globalThis as unknown as { __fidely?: Holder };
const holder: Holder = (g.__fidely ??= { db: null, locks: new Map(), txDepth: 0, dirty: false });

function filePath() {
  return path.join(process.cwd(), env.dataDir, "db.json");
}

function load(): DemoDatabase {
  if (holder.db) return holder.db;
  if (env.persist) {
    try {
      const raw = fs.readFileSync(filePath(), "utf8");
      const parsed = JSON.parse(raw) as DemoDatabase;
      if (parsed.version === SEED_VERSION) {
        holder.db = parsed;
        return parsed;
      }
    } catch {
      /* pas encore de fichier : on génère le dataset */
    }
  }
  holder.db = buildSeed();
  flush();
  return holder.db;
}

function flush() {
  if (!env.persist || !holder.db) return;
  try {
    const p = filePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const tmp = `${p}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(holder.db));
    fs.renameSync(tmp, p);
  } catch (e) {
    // Système de fichiers en lecture seule (ex : hébergement serverless) : la démo reste en mémoire.
    console.warn("[fidely] persistance désactivée :", (e as Error).message);
  }
}

function markDirty() {
  if (holder.txDepth > 0) holder.dirty = true;
  else flush();
}

function matches<T>(row: T, filter?: Partial<T>) {
  if (!filter) return true;
  for (const k in filter) {
    if ((row as Record<string, unknown>)[k] !== (filter as Record<string, unknown>)[k]) return false;
  }
  return true;
}

function table<K extends TableName>(name: K): Table<DemoDatabase[K][number]> {
  type T = DemoDatabase[K][number];
  const rows = () => load()[name] as T[];
  const idOf = (r: T) => (r as { id?: string; merchantId?: string }).id ?? (r as { merchantId: string }).merchantId;
  return {
    async findById(id) {
      return rows().find((r) => idOf(r) === id) ?? null;
    },
    async findMany(filter) {
      return rows().filter((r) => matches(r, filter));
    },
    async findOne(filter) {
      return rows().find((r) => matches(r, filter)) ?? null;
    },
    async count(filter) {
      return filter ? rows().filter((r) => matches(r, filter)).length : rows().length;
    },
    async insert(row) {
      rows().push(row);
      markDirty();
      return row;
    },
    async update(id, patch) {
      const list = rows();
      const i = list.findIndex((r) => idOf(r) === id);
      if (i < 0) throw new Error(`${name}: ${id} introuvable`);
      list[i] = { ...list[i], ...patch };
      markDirty();
      return list[i];
    },
    async remove(id) {
      const list = rows();
      const i = list.findIndex((r) => idOf(r) === id);
      if (i >= 0) list.splice(i, 1);
      markDirty();
    },
  };
}

export const demoRepositories: Repositories = {
  merchants: table("merchants"),
  stores: table("stores"),
  users: table("users"),
  programs: table("programs"),
  rewards: table("rewards"),
  customers: table("customers"),
  cards: table("cards"),
  transactions: table("transactions"),
  issuances: table("issuances"),
  campaigns: table("campaigns"),
  automations: table("automations"),
  messageLogs: table("messageLogs"),
  subscriptions: table("subscriptions"),
  invoices: table("invoices"),
  auditLogs: table("auditLogs"),
  consentLogs: table("consentLogs"),
  tickets: table("tickets"),
  async tx(fn) {
    holder.txDepth++;
    try {
      return await fn();
    } finally {
      holder.txDepth--;
      if (holder.txDepth === 0 && holder.dirty) {
        holder.dirty = false;
        flush();
      }
    }
  },
  async withLock(key, fn) {
    const prev = holder.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((r) => (release = r));
    const chained = prev.then(() => current);
    holder.locks.set(key, chained);
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (holder.locks.get(key) === chained) holder.locks.delete(key);
    }
  },
  meta() {
    const db = load();
    return { seededAt: db.seededAt, version: db.version };
  },
};

/** Réinitialise intégralement la base de démonstration. */
export function resetDemoDatabase(): void {
  holder.db = buildSeed();
  flush();
}

/** Base vide (tests). */
export function replaceDatabase(db: DemoDatabase): void {
  holder.db = db;
}
