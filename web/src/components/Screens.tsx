"use client";

import { useApp } from "@/store/AppProvider";
import { AdminCreateMerchant } from "@/components/screens/AdminCreateMerchant";
import { AdminLiveRequests } from "@/components/screens/AdminLiveRequests";
import { AdminDashboard } from "@/components/screens/AdminDashboard";
import { AdminMerchantDetail } from "@/components/screens/AdminMerchantDetail";
import { AdminMerchants } from "@/components/screens/AdminMerchants";
import { AdminSettings } from "@/components/screens/AdminSettings";
import { Analytics } from "@/components/screens/Analytics";
import { Branches } from "@/components/screens/Branches";
import { CreateBranch } from "@/components/screens/CreateBranch";
import { CreateLink } from "@/components/screens/CreateLink";
import { CreateTeam } from "@/components/screens/CreateTeam";
import { DeveloperDocs } from "@/components/screens/DeveloperDocs";
import { Integrations } from "@/components/screens/Integrations";
import { LinkCreated } from "@/components/screens/LinkCreated";
import { LinkDetail } from "@/components/screens/LinkDetail";
import { LinksList } from "@/components/screens/LinksList";
import { MerchantDashboard } from "@/components/screens/MerchantDashboard";
import { MerchantSettings } from "@/components/screens/MerchantSettings";
import { SalesDashboard } from "@/components/screens/SalesDashboard";
import { Team } from "@/components/screens/Team";

// Renders whichever dashboard screen the current view selects, in the same
// order the prototype declared them.
export function Screens() {
  const {
    isAdminDashboard,
    isMerchDashboard,
    isCreate,
    isMerchCreated,
    isLinksList,
    isMerchLinkDetail,
    isAnalytics,
    isMerchBranches,
    isMerchTeam,
    isMerchSettings,
    isAdminMerchants,
    isAdminMerchantDetail,
    isAdminCreateMerchant,
    isAdminSettings,
    isBranchCreate,
    isTeamCreate,
    isSalesDashboard,
    isIntegrations,
    isDeveloperDocs,
    isAdminLiveRequests,
  } = useApp();

  return (
    <>
      {isAdminDashboard && <AdminDashboard />}
      {isMerchDashboard && <MerchantDashboard />}
      {isCreate && <CreateLink />}
      {isMerchCreated && <LinkCreated />}
      {isLinksList && <LinksList />}
      {isMerchLinkDetail && <LinkDetail />}
      {isAnalytics && <Analytics />}
      {isMerchBranches && <Branches />}
      {isMerchTeam && <Team />}
      {isMerchSettings && <MerchantSettings />}
      {isAdminMerchants && <AdminMerchants />}
      {isAdminMerchantDetail && <AdminMerchantDetail />}
      {isAdminCreateMerchant && <AdminCreateMerchant />}
      {isAdminSettings && <AdminSettings />}
      {isBranchCreate && <CreateBranch />}
      {isTeamCreate && <CreateTeam />}
      {isSalesDashboard && <SalesDashboard />}
      {isIntegrations && <Integrations />}
      {isDeveloperDocs && <DeveloperDocs />}
      {isAdminLiveRequests && <AdminLiveRequests />}
    </>
  );
}
