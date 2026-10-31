import "server-only";
import type { Repositories } from "./repository";
import { demoRepositories } from "./demo-store";

/**
 * Point d'entrée unique de l'accès aux données.
 * Production : remplacer par createSupabaseRepositories() (voir supabase/README).
 */
export function getRepos(): Repositories {
  return demoRepositories;
}
