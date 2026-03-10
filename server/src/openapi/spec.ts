import { API_PREFIX } from "@paperclipai/shared";

export type OpenApiSpec = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description: string }>;
  tags: Array<{ name: string; description: string }>;
  paths: Record<string, unknown>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
  security: Array<Record<string, string[]>>;
  "x-paperclip": Record<string, unknown>;
};

function readVersion(): string {
  return process.env.PAPERCLIP_VERSION?.trim() || "0.0.0";
}

function resolveServerUrl(baseUrl: string | undefined): string {
  if (baseUrl && baseUrl.trim()) {
    return `${baseUrl.replace(/\/+$/, "")}${API_PREFIX}`;
  }
  return API_PREFIX;
}

export function buildOpenApiSpec(opts?: { publicBaseUrl?: string }): OpenApiSpec {
  const apiBase = resolveServerUrl(opts?.publicBaseUrl);

  return {
    openapi: "3.1.0",
    info: {
      title: "Paperclip Control Plane API",
      version: readVersion(),
      description: "Control plane API for autonomous AI companies.",
    },
    servers: [
      {
        url: apiBase,
        description: "Paperclip API",
      },
    ],
    tags: [
      { name: "system", description: "Health and runtime diagnostics" },
      { name: "companies", description: "Company lifecycle and metadata" },
      { name: "agents", description: "Agent management and runtime control" },
      { name: "issues", description: "Task and issue management" },
      { name: "access", description: "Identity and permission management" },
    ],
    paths: {
      "/health": {
        get: {
          tags: ["system"],
          summary: "Health check",
          responses: {
            "200": {
              description: "Service health",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" },
                },
              },
            },
          },
        },
      },
      "/companies": {
        get: {
          tags: ["companies"],
          summary: "List companies",
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: {
            "200": {
              description: "Company list",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CompanyListEnvelope" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
          },
        },
      },
      "/agents": {
        get: {
          tags: ["agents"],
          summary: "List agents",
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: {
            "200": {
              description: "Agent list",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GenericSuccessEnvelope" },
                },
              },
            },
          },
        },
      },
      "/issues": {
        get: {
          tags: ["issues"],
          summary: "List issues",
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: {
            "200": {
              description: "Issue list",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GenericSuccessEnvelope" },
                },
              },
            },
          },
        },
      },
      "/openapi.json": {
        get: {
          tags: ["system"],
          summary: "Get OpenAPI spec",
          responses: {
            "200": {
              description: "OpenAPI spec",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: true,
                  },
                },
              },
            },
          },
        },
      },
      "/metrics": {
        get: {
          tags: ["system"],
          summary: "Prometheus metrics",
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: {
            "200": {
              description: "Prometheus exposition format",
              content: {
                "text/plain": {
                  schema: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
        },
      },
      schemas: {
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", const: "ok" },
            deploymentMode: { type: "string" },
            deploymentExposure: { type: "string" },
            authReady: { type: "boolean" },
            bootstrapStatus: { type: "string" },
          },
          required: ["status"],
        },
        Company: {
          type: "object",
          additionalProperties: true,
        },
        ApiEnvelopeBase: {
          type: "object",
          properties: {
            trace_id: { type: "string" },
            code: { type: "integer" },
            message: { type: "string" },
          },
          required: ["trace_id", "code", "message"],
        },
        CompanyListEnvelope: {
          allOf: [
            { $ref: "#/components/schemas/ApiEnvelopeBase" },
            {
              type: "object",
              properties: {
                data: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Company" },
                },
              },
              required: ["data"],
            },
          ],
        },
        GenericSuccessEnvelope: {
          allOf: [
            { $ref: "#/components/schemas/ApiEnvelopeBase" },
            {
              type: "object",
              properties: {
                data: {
                  oneOf: [{ type: "array" }, { type: "object" }, { type: "null" }],
                },
              },
              required: ["data"],
            },
          ],
        },
        ErrorEnvelope: {
          allOf: [
            { $ref: "#/components/schemas/ApiEnvelopeBase" },
            {
              type: "object",
              properties: {
                code: { type: "integer", minimum: 400, maximum: 599 },
                data: {
                  oneOf: [{ type: "object" }, { type: "array" }, { type: "string" }, { type: "null" }],
                },
              },
              required: ["data"],
            },
          ],
        },
      },
    },
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    "x-paperclip": {
      contractVersion: "v1",
      envelopeRequiredHeader: "x-paperclip-api-envelope: v1",
      compatibility: {
        backwardCompatible: true,
        note: "Spec currently covers core stable endpoints; additional endpoints are added incrementally.",
      },
    },
  };
}
