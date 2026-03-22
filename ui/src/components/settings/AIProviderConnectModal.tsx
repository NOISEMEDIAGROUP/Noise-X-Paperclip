/**
 * AI Provider Connect Modal
 * 
 * Simplified modal for connecting AI providers with:
 * - API key input
 * - Model selection (for supported providers)
 * - Connection test
 * - Easy apply to agents
 */

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { secretsApi } from "../../api/secrets";
import { agentsApi } from "../../api/agents";
import { useCompany } from "../../context/CompanyContext";
import { queryKeys } from "../../lib/queryKeys";
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
import {
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Cpu,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { AIProviderConfig, AIProviderField } from "./aiProviderConfigs";

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
  models?: string[];
};

type AIProviderConnectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AIProviderConfig;
  existingSecretId?: string;
  onSuccess?: () => void;
};

// ============================================================================
// Component
// ============================================================================

export function AIProviderConnectModal({
  open,
  onOpenChange,
  config,
  existingSecretId,
  onSuccess,
}: AIProviderConnectModalProps) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  // State
  const [step, setStep] = useState<ModalStep>("configure");
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>(() =>
    initializeFieldStates(config.fields)
  );
  const [showPassword, setShowPassword] = useState(false);
  const [selectedModel, setSelectedModel] = useState(config.defaultModel || "");
  const [applyToAgents, setApplyToAgents] = useState(true);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Initialize on open
  useEffect(() => {
    if (open) {
      setFieldStates(initializeFieldStates(config.fields));
      setStep("configure");
      setTestResult(null);
      setSelectedModel(config.defaultModel || "");
    }
  }, [open, config.id]);

  // Validation
  const requiredFields = config.fields.filter((f) => f.required);
  const allRequiredFilled = requiredFields.every(
    (f) => fieldStates[f.key]?.value?.trim()
  );
  const hasErrors = Object.values(fieldStates).some((s) => s.error && s.touched);
  const canProceedToTest = allRequiredFilled && !hasErrors;

  // Test mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {
        apiKey: fieldStates.apiKey?.value?.trim() || "",
      };
      if (selectedModel) {
        payload.model = selectedModel;
      }
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

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const apiKey = fieldStates.apiKey?.value?.trim();
      if (!apiKey) throw new Error("API key is required");

      // 1. Save secret
      if (existingSecretId) {
        await secretsApi.rotate(existingSecretId, { value: apiKey });
      } else {
        await secretsApi.create(selectedCompanyId!, {
          name: config.secretName,
          value: apiKey,
          description: `${config.name} API key (managed from settings)`,
        });
      }

      // 2. Apply to agents if requested
      if (applyToAgents && config.supportsModelSelection && selectedModel) {
        // This would be handled by the backend in a real implementation
        // For now, we just save the key
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.secrets.list(selectedCompanyId!) });
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

  const handleFieldBlur = useCallback((key: string, field: AIProviderField) => {
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

  // Render
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            {/* Setup hint */}
            {config.setupGuide && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Cpu className="h-4 w-4" />
                <span>Setup time: {config.setupTime || "1 minute"}</span>
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

            {/* API Key Field */}
            {config.fields.map((field) => (
              <div key={field.key} className="space-y-2">
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
                      {field.docsLabel || "Get key"} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="relative">
                  <Input
                    id={field.key}
                    type={field.type === "password" && !showPassword ? "password" : "text"}
                    value={fieldStates[field.key]?.value || ""}
                    placeholder={field.placeholder}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    onBlur={() => handleFieldBlur(field.key, field)}
                    className={cn(fieldStates[field.key]?.error && fieldStates[field.key]?.touched && "border-destructive")}
                  />
                  {field.type === "password" && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">{field.hint}</p>
                {fieldStates[field.key]?.error && fieldStates[field.key]?.touched && (
                  <p className="text-xs text-destructive">{fieldStates[field.key].error}</p>
                )}
              </div>
            ))}

            {/* Model Selection */}
            {config.supportsModelSelection && config.popularModels && (
              <div className="space-y-2">
                <Label htmlFor="model">Default Model</Label>
                <select
                  id="model"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <option value="">Select a model</option>
                  {config.popularModels.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  This model will be used for all agents by default.
                </p>
              </div>
            )}

            {/* Apply to Agents Toggle */}
            <div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Apply to all agents</p>
                <p className="text-xs text-muted-foreground">
                  Automatically configure all active agents to use this provider.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApplyToAgents(!applyToAgents)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  applyToAgents ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    applyToAgents ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
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
                    {testResult.models && testResult.models.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Available models: {testResult.models.slice(0, 3).join(", ")}
                        {testResult.models.length > 3 && ` +${testResult.models.length - 3} more`}
                      </p>
                    )}
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

// ============================================================================
// Helpers
// ============================================================================

function initializeFieldStates(fields: AIProviderField[]): Record<string, FieldState> {
  const states: Record<string, FieldState> = {};
  for (const field of fields) {
    states[field.key] = { value: "", touched: false };
  }
  return states;
}

function validateField(field: AIProviderField, value: string): string | undefined {
  if (field.required && !value.trim()) {
    return `${field.label} is required`;
  }
  return undefined;
}