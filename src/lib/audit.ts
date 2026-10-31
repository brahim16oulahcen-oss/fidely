import "server-only";
import type { Repositories } from "@/lib/db/repository";
import { newId } from "@/lib/utils/ids";
import type { AuditLog } from "@/types/domain";

export async function audit(
  repos: Repositories,
  entry: Omit<AuditLog, "id" | "createdAt"> & { createdAt?: string },
) {
  await repos.auditLogs.insert({ id: newId("aud"), createdAt: new Date().toISOString(), ...entry });
}
