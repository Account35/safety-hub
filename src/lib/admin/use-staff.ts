import { useQuery } from "@tanstack/react-query";
import { checkStaffAccess } from "@/lib/admin/admin.functions";

export function useStaff() {
  const { data } = useQuery({
    queryKey: ["admin", "staff-check"],
    queryFn: () => checkStaffAccess(),
    staleTime: 60_000,
  });
  const roles = data?.roles ?? [];
  return {
    roles,
    can: (...allowed: string[]) => roles.some((r) => allowed.includes(r)),
  };
}