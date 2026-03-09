// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { invalidateProjectQueries, getProjectDetailQueryKeys } from "./projectQueries";
import { queryKeys } from "./queryKeys";

describe("projectQueries", () => {
  const project = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    companyId: "company-123",
    urlKey: "alpha-project",
    name: "Alpha Project",
  };

  it("returns every detail query key variant needed for a project detail page", () => {
    expect(getProjectDetailQueryKeys(project, "legacy-route-ref")).toEqual([
      queryKeys.projects.detail(project.id),
      queryKeys.projects.detail(project.urlKey),
      queryKeys.projects.detail("legacy-route-ref"),
    ]);
  });

  it("deduplicates matching route references", () => {
    expect(getProjectDetailQueryKeys(project, project.urlKey)).toEqual([
      queryKeys.projects.detail(project.id),
      queryKeys.projects.detail(project.urlKey),
    ]);
  });

  it("invalidates all project detail variants and the company project list", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);

    await invalidateProjectQueries({ invalidateQueries }, project, "legacy-route-ref");

    expect(invalidateQueries).toHaveBeenCalledTimes(4);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys.projects.detail(project.id),
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys.projects.detail(project.urlKey),
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(3, {
      queryKey: queryKeys.projects.detail("legacy-route-ref"),
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(4, {
      queryKey: queryKeys.projects.list(project.companyId),
    });
  });
});
