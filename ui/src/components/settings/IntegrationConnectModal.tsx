/**
 * Integration Connect Modal
 * 
 * A reusable modal for connecting integrations with:
 * - Step-by-step guidance
 * - Real-time validation
 * - Connection testing before saving
 * - Clear error messages
 */

import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../api/client";
import { secretsApi } from "../../api/secrets";
import { businessOsApi } from "../../api/businessOs";
import { useCompany } from "../../context/CompanyContext";
import { queryKeys } from "../../lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { IntegrationConfig, IntegrationField } from "./integrationConfigs";

// ============================================================================
// Types
// ============================================================================

type ModalStep = "configure" | "test" | "success";

type FieldState = {
  value: string;
  error?: string;
  touched: boolean;
};

type TestResult = {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
};

type IntegrationConnectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: IntegrationConfig;
  existingSecrets?: Map<string, string>; // secret name -> secret id
  existingConfig?: Record<string, unknown>;
  onSuccess?: () => void;
};

// ============================================================================
// Component
// ============================================================================

export function IntegrationConnectModal({
  open,
  onOpenChange,
  config,
  existingSecrets = new Map(),
  existingConfig = {},
  onSuccess,
}: IntegrationConnectModalProps) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  // State
  const [step, setStep] = useState<ModalStep>("configure");
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>(() =>
    initializeFieldStates(config.fields, existingConfig)
  );
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Initialize field states when modal opens with new config
  useEffect(() => {
    if (open) {
      setFieldStates(initializeFieldStates(config.fields, existingConfig));
      setStep("configure");
      setTestResult(null);
      setShowPassword({});
    }
  }, [open, config.id, existingConfig]);

  // Compute form validity
  const requiredFields = config.fields.filter((f) => f.required);
  const allRequiredFilled = requiredFields.every(
    (f) => fieldStates[f.key]?.value?.trim()
  );
  const hasErrors = Object.values(fieldStates).some((s) => s.error && s.touched);
  const canProceedToTest = allRequiredFilled && !hasErrors;

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const payload = buildTestPayload(config, fieldStates);
      return api.post<TestResult>(
        `/companies/${selectedCompanyId}${config.testEndpoint}`,
        payload
      );
    },
    onSuccess: (result) => {
      setTestResult(result);
      if (result.success) {
        setStep("success");
      }
    },
    onError: (error) => {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      });
    },
  });

  // Save mutation (saves secrets + updates config)
  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Save secrets
      const secretSaves = config.fields.map(async (field) => {
        const value = fieldStates[field.key]?.value?.trim();
        if (!value) return null;

        const secretName = getSecretNameForField(config, field.key);
        const existingId = existingSecrets.get(secretName);

        if (existingId) {
          return secretsApi.rotate(existingId, { value });
        } else {
          return secretsApi.create(selectedCompanyId!, {
            name: secretName,
            value,
            description: `${config.name} - ${field.label}`,
          });
        }
      });

      await Promise.all(secretSaves);

      // 2. Update business config
      const configUpdates: Record<string, unknown> = {};
      config.fields.forEach((field) => {
        const secretName = getSecretNameForField(config, field.key);
        const configField = getConfigFieldForField(config, field.key);
        if (configField) {
          if (field.key.includes("Key") || field.key.includes("Token") || field.key.includes("Secret") || field.key.includes("Dsn")) {
            // Secret reference field
            configUpdates[configField] = secretName;
          } else {
            // Direct value field
            configUpdates[configField] = fieldStates[field.key]?.value?.trim() || "";
          }
        }
      });

      // Enable the integration if this is a notification channel
      if (config.id === "telegram") configUpdates.telegramEnabled = true;
      if (config.id === "slack") configUpdates.slackEnabled = true;
      if (config.id === "resend") configUpdates.emailEnabled = true;

      await businessOsApi.updateConfig(selectedCompanyId!, configUpdates);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.secrets.list(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.businessOs.config(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.businessOs.integrationStatus(selectedCompanyId!) });
      onSuccess?.();
      onOpenChange(false);
    },
  });

  // Handlers
  const handleFieldChange = useCallback((key: string, value: string) => {
    setFieldStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], value, touched: true },
    }));
  }, []);

  const handleFieldBlur = useCallback((key: string, field: IntegrationField) => {
    // Validate on blur
    const value = fieldStates[key]?.value?.trim() || "";
    const error = validateField(field, value);
    setFieldStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], error, touched: true },
    }));
  }, [fieldStates]);

  const handleTest = useCallback(() => {
    if (!canProceedToTest) return;
    setStep("test");
    setTestResult(null);
    testMutation.mutate();
  }, [canProceedToTest, testMutation]);

  const handleSave = useCallback(() => {
    saveMutation.mutate();
  }, [saveMutation]);

  const togglePasswordVisibility = useCallback((key: string) => {
    setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Reset when modal closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset state
      setStep("configure");
      setTestResult(null);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  // Render
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <config.icon className="h-6 w-6 text-muted-foreground" />
            <div>
              <DialogTitle>Connect {config.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {config.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-2">
          <StepIndicator step={1} currentStep={step === "configure" ? 1 : step === "test" ? 2 : 3} label="Configure" />
          <div className="flex-1 h-px bg-border" />
          <StepIndicator step={2} currentStep={step === "configure" ? 1 : step === "test" ? 2 : 3} label="Test" />
          <div className="flex-1 h-px bg-border" />
          <StepIndicator step={3} currentStep={step === "configure" ? 1 : step === "test" ? 2 : 3} label="Save" />
        </div>

        {/* Configure Step */}
        {step === "configure" && (
          <div className="space-y-4">
            {/* Setup guide link */}
            {config.setupGuide && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Setup time: {config.setupTime || "a few minutes"}</span>
                <a
                  href={config.setupGuide}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  View guide <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Fields */}
            {config.fields.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                state={fieldStates[field.key] || { value: "", touched: false }}
                showPassword={showPassword[field.key]}
                onTogglePassword={() => togglePasswordVisibility(field.key)}
                onChange={(value) => handleFieldChange(field.key, value)}
                onBlur={() => handleFieldBlur(field.key, field)}
              />
            ))}

            {/* Validation summary */}
            {!allRequiredFilled && (
              <p className="text-sm text-muted-foreground">
                Fill in all required fields to continue.
              </p>
            )}
          </div>
        )}

        {/* Test Step */}
        {step === "test" && (
          <div className="space-y-4 py-4">
            {testMutation.isPending && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-muted-foreground">Testing connection...</span>
              </div>
            )}

            {testResult && !testResult.success && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-destructive">Connection failed</p>
                    <p className="text-sm text-muted-foreground">{testResult.message}</p>
                  </div>
                </div>
              </div>
            )}

            {testResult?.success && (
              <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-green-600">Connection successful!</p>
                    <p className="text-sm text-muted-foreground">{testResult.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success Step */}
        {step === "success" && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center gap-3 py-4">
              <div className="rounded-full bg-green-500/20 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-center">
                <p className="font-medium">Ready to save</p>
                <p className="text-sm text-muted-foreground">
                  Your {config.name} connection is verified. Click Save to complete the setup.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "configure" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleTest} disabled={!canProceedToTest}>
                Test Connection
              </Button>
            </>
          )}

          {step === "test" && testResult && !testResult.success && (
            <>
              <Button variant="outline" onClick={() => setStep("configure")}>
                Back
              </Button>
              <Button onClick={handleTest}>Retry Test</Button>
            </>
          )}

          {step === "success" && (
            <>
              <Button variant="outline" onClick={() => setStep("configure")}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Connection"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StepIndicator({
  step,
  currentStep,
  label,
}: {
  step: number;
  currentStep: number;
  label: string;
}) {
  const isComplete = currentStep > step;
  const isCurrent = currentStep === step;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
          isComplete && "bg-primary text-primary-foreground",
          isCurrent && "bg-primary text-primary-foreground",
          !isComplete && !isCurrent && "bg-muted text-muted-foreground"
        )}
      >
        {isComplete ? <CheckCircle2 className="h-4 w-4" /> : step}
      </div>
      <span
        className={cn(
          "text-xs font-medium",
          isCurrent ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function FieldInput({
  field,
  state,
  showPassword,
  onTogglePassword,
  onChange,
  onBlur,
}: {
  field: IntegrationField;
  state: FieldState;
  showPassword: boolean;
  onTogglePassword: () => void;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const inputType = field.type === "password" && showPassword ? "text" : field.type;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={field.key} className="flex items-center gap-1">
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
        </Label>
        {field.docsUrl && (
          <a
            href={field.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            {field.docsLabel || "Learn more"} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="relative">
        <Input
          id={field.key}
          type={inputType}
          value={state.value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cn(state.error && state.touched && "border-destructive")}
        />
        {field.type === "password" && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground">{field.hint}</p>

      {/* Error */}
      {state.error && state.touched && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function initializeFieldStates(
  fields: IntegrationField[],
  existingConfig: Record<string, unknown>
): Record<string, FieldState> {
  const states: Record<string, FieldState> = {};
  for (const field of fields) {
    // Try to get existing value from config
    const existingValue = existingConfig[field.key] || "";
    states[field.key] = {
      value: String(existingValue),
      touched: false,
    };
  }
  return states;
}

function validateField(field: IntegrationField, value: string): string | undefined {
  if (field.required && !value.trim()) {
    return `${field.label} is required`;
  }

  if (field.pattern && value.trim()) {
    const regex = new RegExp(field.pattern);
    if (!regex.test(value.trim())) {
      return field.patternError || "Invalid format";
    }
  }

  return undefined;
}

function buildTestPayload(
  config: IntegrationConfig,
  fieldStates: Record<string, FieldState>
): Record<string, string> {
  const payload: Record<string, string> = {};
  for (const field of config.fields) {
    const value = fieldStates[field.key]?.value?.trim();
    if (value) {
      payload[field.key] = value;
    }
  }
  return payload;
}

function getSecretNameForField(config: IntegrationConfig, fieldKey: string): string {
  // Map field keys to secret names
  const secretFieldMap: Record<string, Record<string, string>> = {
    stripe: {
      secretKey: "business-stripe-secret-key",
      webhookSecret: "business-stripe-webhook-secret",
    },
    telegram: {
      botToken: "business-telegram-bot-token",
    },
    slack: {
      botToken: "business-slack-bot-token",
      signingSecret: "business-slack-signing-secret",
    },
    resend: {
      apiKey: "business-resend-api-key",
    },
    github: {
      token: "business-github-token",
    },
    sentry: {
      dsn: "business-sentry-dsn",
    },
    uptimeKuma: {
      apiKey: "business-uptime-kuma-api-key",
    },
    plausible: {
      apiKey: "business-plausible-api-key",
    },
  };

  return secretFieldMap[config.id]?.[fieldKey] || `business-${config.id}-${fieldKey}`;
}

function getConfigFieldForField(config: IntegrationConfig, fieldKey: string): string | null {
  // Map field keys to business config fields
  const configFieldMap: Record<string, Record<string, string>> = {
    stripe: {
      secretKey: "stripeSecretKeyName",
      webhookSecret: "stripeWebhookSecretName",
    },
    telegram: {
      botToken: "telegramBotTokenSecretName",
      chatId: "telegramChatId",
    },
    slack: {
      botToken: "slackBotTokenSecretName",
      signingSecret: "slackSigningSecretName",
      defaultChannelId: "slackDefaultChannelId",
    },
    resend: {
      apiKey: "resendApiKeySecretName",
      fromEmail: "resendFromEmail",
    },
    github: {
      token: "githubTokenSecretName",
      repoOwner: "githubRepoOwner",
      repoName: "githubRepoName",
    },
    sentry: {
      dsn: "sentryDsnSecretName",
    },
    uptimeKuma: {
      url: "uptimeKumaUrl",
      apiKey: "uptimeKumaApiKeySecretName",
    },
    plausible: {
      siteId: "plausibleSiteId",
      apiKey: "plausibleApiKeySecretName",
    },
  };

  return configFieldMap[config.id]?.[fieldKey] || null;
}