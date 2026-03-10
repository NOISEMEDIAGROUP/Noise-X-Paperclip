import { describe, expect, it } from "vitest";
import { buildOpenApiSpec } from "../openapi/spec.js";

describe("buildOpenApiSpec", () => {
  it("builds a v3.1 spec with core paths", () => {
    const spec = buildOpenApiSpec({ publicBaseUrl: "https://paperclip.example.com" });

    expect(spec.openapi).toBe("3.1.0");
    expect(spec.servers[0]?.url).toBe("https://paperclip.example.com/api");
    expect(spec.paths["/health"]).toBeDefined();
    expect(spec.paths["/companies"]).toBeDefined();
    expect(spec.paths["/openapi.json"]).toBeDefined();
  });

  it("includes envelope schema", () => {
    const spec = buildOpenApiSpec();
    const schemas = spec.components.schemas;

    expect(schemas.ApiEnvelopeBase).toBeDefined();
    expect(schemas.ErrorEnvelope).toBeDefined();
  });
});
