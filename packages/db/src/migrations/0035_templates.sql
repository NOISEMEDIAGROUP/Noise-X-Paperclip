-- Agent & Workflow Templates
-- Pre-built templates for quick deployment

-- Template library (pre-built templates)
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'agent', 'workflow', 'knowledge-base'
  description TEXT,
  thumbnail_url TEXT,
  preview_data JSONB, -- Preview screenshot/demo data
  configuration JSONB NOT NULL, -- Template configuration
  version TEXT NOT NULL DEFAULT '1.0.0',
  is_public BOOLEAN DEFAULT true,
  rating FLOAT DEFAULT 0.0,
  download_count INTEGER DEFAULT 0,
  author TEXT,
  tags TEXT[] DEFAULT '{}', -- e.g., ['sales', 'automation', 'customer-service']
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  INDEX templates_category_idx (category),
  INDEX templates_name_idx (name),
  INDEX templates_tags_idx USING GIN (tags)
);

-- Template usage tracking (which companies use which templates)
CREATE TABLE template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  workflow_id UUID,
  customizations JSONB, -- What was customized from the template
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, company_id, agent_id),
  INDEX template_usage_company_idx (company_id),
  INDEX template_usage_template_idx (template_id)
);

-- Template ratings (user reviews)
CREATE TABLE template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, user_id),
  INDEX template_ratings_template_idx (template_id)
);

-- PWA Configuration
CREATE TABLE pwa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Paperclip',
  short_name TEXT NOT NULL DEFAULT 'Paperclip',
  description TEXT,
  icon_url TEXT,
  theme_color TEXT DEFAULT '#2563eb',
  background_color TEXT DEFAULT '#ffffff',
  orientation TEXT DEFAULT 'portrait-primary',
  display TEXT DEFAULT 'standalone',
  start_url TEXT DEFAULT '/',
  scope TEXT DEFAULT '/',
  categories TEXT[] DEFAULT '{}',
  screenshots JSONB, -- PWA screenshots
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Landing page configuration
CREATE TABLE landing_page_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_title TEXT NOT NULL DEFAULT 'Unified Agentic Business Platform',
  hero_subtitle TEXT,
  hero_image_url TEXT,
  features JSONB NOT NULL DEFAULT '[]', -- Array of feature blocks
  pricing_tiers JSONB, -- Pricing information
  faqs JSONB DEFAULT '[]', -- Frequently asked questions
  cta_button_text TEXT DEFAULT 'Get Started',
  cta_button_url TEXT DEFAULT '/signup',
  footer_links JSONB, -- Footer navigation
  social_links JSONB, -- Social media links
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
