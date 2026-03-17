export interface ProjectTechStack {
  framework: string;
  runtime: string;
  css: string;
  stateManagement?: string;
  orm?: string;
  additionalLibs?: string[];
}

export interface ProjectModuleStats {
  pages?: number;
  apiEndpoints?: number;
  hooks?: number;
  queries?: number;
  parsers?: number;
  schemas?: number;
}

export interface ProjectIosCompanion {
  repoName: string;
  framework: string;
  minVersion?: string;
}

export interface ProjectIntegration {
  id: string;
  projectId: string;
  companyId: string;
  integrationType: string;
  name: string;
  config: Record<string, unknown> | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectScraper {
  id: string;
  projectId: string;
  companyId: string;
  name: string;
  port: number | null;
  vpsDirectory: string | null;
  status: string;
  healthCheckUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectProfile {
  id: string;
  projectId: string;
  companyId: string;
  slug: string;
  customerName: string | null;
  customerContact: string | null;
  businessModel: string | null;
  productionUrl: string | null;
  stagingUrl: string | null;
  hostPort: number | null;
  vpsDirectory: string | null;
  dbSchema: string | null;
  techStack: ProjectTechStack | null;
  moduleStats: ProjectModuleStats | null;
  iosCompanion: ProjectIosCompanion | null;
  features: Record<string, unknown> | null;
  phase: string;
  launchedAt: string | null;
  integrations: ProjectIntegration[];
  scrapers: ProjectScraper[];
  createdAt: Date;
  updatedAt: Date;
}
