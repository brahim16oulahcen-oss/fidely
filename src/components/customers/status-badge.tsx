import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type CustomerStatus } from "@/features/customers/segments";

const VARIANT: Record<CustomerStatus, "night" | "default" | "success" | "neutral" | "warning"> = {
  vip: "night",
  loyal: "success",
  new: "default",
  active: "neutral",
  inactive: "warning",
};

export function StatusBadge({ status }: { status: CustomerStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
