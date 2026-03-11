import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
} from "../../components/agent-config-primitives";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function CerebrouterConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  return (
    <>
      <Field label="Router Base URL" hint="Cerebrouter base URL. For Docker use service hostname, e.g. http://cerebrouter:7777.">
        <DraftInput
          value={
            isCreate
              ? values!.url
              : eff("adapterConfig", "baseUrl", String(config.baseUrl ?? config.url ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ url: v })
              : mark("adapterConfig", "baseUrl", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="http://127.0.0.1:7777"
        />
      </Field>

      <Field label="Model" hint="Model ID from cerebrouter /v1/models catalog.">
        <DraftInput
          value={
            isCreate
              ? values!.model
              : eff("adapterConfig", "model", String(config.model ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ model: v })
              : mark("adapterConfig", "model", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="gpt-oss-120b"
        />
      </Field>

      <Field label="Router API Key" hint="Bearer token expected by cerebrouter. Optional if ROUTER_API_KEY is set on server.">
        <DraftInput
          type="password"
          value={
            isCreate
              ? values!.apiKey
              : eff("adapterConfig", "apiKey", String(config.apiKey ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ apiKey: v })
              : mark("adapterConfig", "apiKey", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="sk-cerebrouter-..."
        />
      </Field>
    </>
  );
}
