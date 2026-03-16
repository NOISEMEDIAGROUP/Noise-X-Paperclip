-- Create workflow_webhooks table for webhook-triggered workflows
CREATE TABLE workflow_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  is_active TEXT NOT NULL DEFAULT 'true',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX workflow_webhooks_workflow_id_idx ON workflow_webhooks(workflow_id);
CREATE INDEX workflow_webhooks_company_id_idx ON workflow_webhooks(company_id);
