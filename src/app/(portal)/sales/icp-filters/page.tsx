import { getIcpFilterDashboard } from "@/actions/icp-filters";
import { requireSalesAccess, isSalesOwner } from "@/lib/auth";
import { IcpFiltersClient } from "@/components/sales/icp-filters-client";

export default async function IcpFiltersPage() {
  const employee = await requireSalesAccess();
  const data = await getIcpFilterDashboard();

  return (
    <IcpFiltersClient
      filters={data.filters}
      coverage={data.coverage}
      profiles={data.profiles}
      years={data.years}
      geographies={data.geographies}
      syncMeta={data.syncMeta}
      isOwner={isSalesOwner(employee.role)}
      error={data.error}
    />
  );
}
