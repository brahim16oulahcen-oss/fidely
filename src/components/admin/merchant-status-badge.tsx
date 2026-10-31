import { Badge } from "@/components/ui/badge";
import type { MerchantStatus } from "@/types/domain";

const MAP: Record<MerchantStatus, { label: string; v: "success" | "default" | "danger" | "neutral" }> = {
  active: { label: "Actif", v: "success" },
  trial: { label: "Essai", v: "default" },
  suspended: { label: "Suspendu", v: "danger" },
  cancelled: { label: "Résilié", v: "neutral" },
};
export function MerchantStatusBadge({ status }: { status: MerchantStatus }) {
  return <Badge variant={MAP[status].v}>{MAP[status].label}</Badge>;
}
