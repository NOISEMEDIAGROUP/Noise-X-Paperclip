import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AGENT_ROLES } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { skillsApi, type SkillScope } from "../api/skills";
import { queryKeys } from "../lib/queryKeys";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";

const SCOPE_OPTIONS: SkillScope[] = ["all", ...AGENT_ROLES];

function defaultScopes(): SkillScope[] {
  return ["all"];
}

export function Skills() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<SkillScope[]>(defaultScopes);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: "Skills" }]);
  }, [setBreadcrumbs]);

  const skillsQuery = useQuery({
    queryKey: selectedCompanyId ? queryKeys.skills.list(selectedCompanyId) : ["skills", "none"],
    queryFn: () => skillsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  const createSkill = useMutation({
    mutationFn: () =>
      skillsApi.create(selectedCompanyId!, {
        name,
        label,
        description: description || null,
        content,
        scope,
      }),
    onSuccess: async () => {
      setSuccess(`Created skill '${name.trim().toLowerCase()}'`);
      setError(null);
      setName("");
      setLabel("");
      setDescription("");
      setContent("");
      setScope(defaultScopes());
      await queryClient.invalidateQueries({ queryKey: queryKeys.skills.list(selectedCompanyId!) });
    },
    onError: (err) => {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Failed to create skill");
    },
  });

  const deleteSkill = useMutation({
    mutationFn: (skillId: string) => skillsApi.remove(selectedCompanyId!, skillId),
    onSuccess: async () => {
      setError(null);
      setSuccess("Deleted skill");
      await queryClient.invalidateQueries({ queryKey: queryKeys.skills.list(selectedCompanyId!) });
    },
    onError: (err) => {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Failed to delete skill");
    },
  });

  const sortedSkills = useMemo(
    () => [...(skillsQuery.data ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    [skillsQuery.data],
  );

  function toggleScope(item: SkillScope) {
    setScope((current) => {
      if (item === "all") {
        return current.includes("all") ? [] : ["all"];
      }
      const withoutAll = current.filter((entry) => entry !== "all");
      if (withoutAll.includes(item)) {
        const next = withoutAll.filter((entry) => entry !== item);
        return next.length > 0 ? next : ["all"];
      }
      return [...withoutAll, item];
    });
  }

  if (!selectedCompanyId) {
    return <div className="text-sm text-muted-foreground">Select a company to manage skills.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Skills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload (paste) skill markdown and assign scope. Agents can then select these skills in their config.
          {selectedCompany ? ` Company: ${selectedCompany.name}` : ""}
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Create skill</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Name (slug)</span>
            <input
              className="w-full rounded-md border border-border px-2.5 py-2 text-sm"
              placeholder="e.g. security-review-checklist"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Label</span>
            <input
              className="w-full rounded-md border border-border px-2.5 py-2 text-sm"
              placeholder="Security Review Checklist"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
        </div>

        <label className="space-y-1 text-xs block">
          <span className="text-muted-foreground">Description</span>
          <input
            className="w-full rounded-md border border-border px-2.5 py-2 text-sm"
            placeholder="When this skill should be used"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Scope (tick all that apply)</div>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-border p-2 md:grid-cols-4">
            {SCOPE_OPTIONS.map((item) => (
              <label key={item} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={scope.includes(item)}
                  onChange={() => toggleScope(item)}
                />
                <span className="font-mono">{item}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="space-y-1 text-xs block">
          <span className="text-muted-foreground">Skill markdown</span>
          <textarea
            className="h-56 w-full rounded-md border border-border px-2.5 py-2 text-xs font-mono"
            placeholder={`---\nname: example-skill\ndescription: >\n  Explain when this skill applies\n---\n\n# Example Skill\n\nSteps and rules...`}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </label>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled={createSkill.isPending || !name.trim() || !label.trim() || !content.trim()}
            onClick={() => createSkill.mutate()}
          >
            {createSkill.isPending ? "Creating..." : "Create Skill"}
          </Button>
          {error && <span className="text-xs text-destructive">{error}</span>}
          {success && !error && <span className="text-xs text-emerald-600">{success}</span>}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Available skills</h2>
        {skillsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading skills...</p>}
        {skillsQuery.error && (
          <p className="text-sm text-destructive">
            {skillsQuery.error instanceof Error ? skillsQuery.error.message : "Failed to load skills"}
          </p>
        )}
        {!skillsQuery.isLoading && sortedSkills.length === 0 && (
          <p className="text-sm text-muted-foreground">No skills yet.</p>
        )}
        <div className="space-y-2">
          {sortedSkills.map((skill) => (
            <div key={skill.id} className="rounded-md border border-border/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{skill.label}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {skill.name}
                    </span>
                    {skill.isBuiltin && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        built-in
                      </span>
                    )}
                  </div>
                  {skill.description && <p className="text-xs text-muted-foreground">{skill.description}</p>}
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Scope: {skill.scope.length > 0 ? skill.scope.join(", ") : "all"}
                  </p>
                </div>
                {!skill.isBuiltin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deleteSkill.isPending}
                    onClick={() => deleteSkill.mutate(skill.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
