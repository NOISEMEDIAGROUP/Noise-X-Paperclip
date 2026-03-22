import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "@/lib/router";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { cn } from "../lib/utils";
import { Settings as SettingsIcon, Building2, Plug, Shield } from "lucide-react";
import { CompanySettingsTab } from "../components/settings/CompanySettingsTab";
import { IntegrationsTab } from "../components/settings/IntegrationsTab";
import { GovernancePage } from "./settings/Governance";

type SettingsTab = "company" | "integrations" | "governance";

function resolveSettingsTab(pathname: string): SettingsTab {
  const segments = pathname.split("/").filter(Boolean);
  const settingsIdx = segments.indexOf("settings");
  if (settingsIdx === -1) return "company";
  const tab = segments[settingsIdx + 1];
  if (tab === "integrations") return "integrations";
  if (tab === "governance") return "governance";
  return "company";
}

export function SettingsPage() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const location = useLocation();
  
  const activeTab = resolveSettingsTab(location.pathname);

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? "Company", href: `/${companyPrefix}/dashboard` },
      { label: "Settings" },
    ]);
  }, [setBreadcrumbs, selectedCompany?.name, companyPrefix]);

  const handleTabChange = (tab: SettingsTab) => {
    navigate(`/${companyPrefix}/settings/${tab}`);
  };

  const tabs: Array<{ key: SettingsTab; label: string; icon: typeof SettingsIcon }> = [
    { key: "company", label: "Company", icon: Building2 },
    { key: "integrations", label: "Integrations", icon: Plug },
    { key: "governance", label: "Governance", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2",
              activeTab === tab.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => handleTabChange(tab.key)}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "company" && <CompanySettingsTab />}
      {activeTab === "integrations" && <IntegrationsTab />}
      {activeTab === "governance" && <GovernancePage />}
    </div>
  );
}