import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { AdapterConfigFieldsProps } from "../types";
import { Field, DraftInput, help } from "../../components/agent-config-primitives";
import { ChoosePathButton } from "../../components/PathInstructionsModal";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

function SecretField({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label="Bridge auth token" hint={help.authToken}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <DraftInput
          value={value}
          onCommit={onCommit}
          immediate
          type={visible ? "text" : "password"}
          className={inputClass + " pl-8"}
          placeholder="shared bridge token"
        />
      </div>
    </Field>
  );
}

export function PicoClawRemoteConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  return (
    <>
      <Field label="Bridge URL" hint={help.webhookUrl}>
        <DraftInput
          value={isCreate ? values!.url : eff("adapterConfig", "url", String(config.url ?? ""))}
          onCommit={(value) =>
            isCreate ? set!({ url: value }) : mark("adapterConfig", "url", value || undefined)
          }
          immediate
          className={inputClass}
          placeholder="https://bridge.example"
        />
      </Field>

      <SecretField
        value={isCreate ? values!.authToken : eff("adapterConfig", "authToken", String(config.authToken ?? ""))}
        onCommit={(value) =>
          isCreate ? set!({ authToken: value }) : mark("adapterConfig", "authToken", value || undefined)
        }
      />

      <Field label="Remote working directory" hint={help.cwd}>
        <DraftInput
          value={isCreate ? values!.cwd : eff("adapterConfig", "cwd", String(config.cwd ?? ""))}
          onCommit={(value) =>
            isCreate ? set!({ cwd: value }) : mark("adapterConfig", "cwd", value || undefined)
          }
          immediate
          className={inputClass}
          placeholder="/srv/project"
        />
      </Field>

      <Field label="Model alias" hint={help.model}>
        <DraftInput
          value={isCreate ? values!.model : eff("adapterConfig", "model", String(config.model ?? ""))}
          onCommit={(value) =>
            isCreate ? set!({ model: value }) : mark("adapterConfig", "model", value || undefined)
          }
          immediate
          className={inputClass}
          placeholder="gpt-5.4"
        />
      </Field>

      <Field label="Agent instructions file" hint="Absolute path to a markdown file on the Paperclip host that will be inlined into the prompt.">
        <div className="flex items-center gap-2">
          <DraftInput
            value={
              isCreate
                ? values!.instructionsFilePath ?? ""
                : eff("adapterConfig", "instructionsFilePath", String(config.instructionsFilePath ?? ""))
            }
            onCommit={(value) =>
              isCreate
                ? set!({ instructionsFilePath: value })
                : mark("adapterConfig", "instructionsFilePath", value || undefined)
            }
            immediate
            className={inputClass}
            placeholder="/absolute/path/to/AGENTS.md"
          />
          <ChoosePathButton />
        </div>
      </Field>
    </>
  );
}
