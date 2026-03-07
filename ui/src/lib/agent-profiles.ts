export interface AlibabaModelProfile {
  id: string;
  label: string;
  modelId: string;
  description: string;
}

export const ALIBABA_MODEL_PROFILES: AlibabaModelProfile[] = [
  {
    id: "exec_briefing",
    label: "Executive Briefing",
    modelId: "MiniMax-M2.5",
    description: "Best for strategy summaries and executive communication.",
  },
  {
    id: "engineering_delivery",
    label: "Engineering Delivery",
    modelId: "qwen3-coder-plus",
    description: "Best default for coding tasks and implementation depth.",
  },
  {
    id: "product_planning",
    label: "Product Planning",
    modelId: "qwen3.5-plus",
    description: "Best for planning docs, decomposition, and reasoning clarity.",
  },
  {
    id: "security_review",
    label: "Security Review",
    modelId: "glm-5",
    description: "Best for risk-oriented review and defensive analysis.",
  },
  {
    id: "qa_validation",
    label: "QA Validation",
    modelId: "glm-4.7",
    description: "Best for deterministic QA checks and issue validation.",
  },
];

export interface SkillProfile {
  id: string;
  label: string;
  description: string;
  requiredSkills: string[];
}

export const SKILL_PROFILES: SkillProfile[] = [
  {
    id: "coordination_core",
    label: "Coordination Core",
    description: "Loads Paperclip coordination procedures for normal operations.",
    requiredSkills: ["paperclip"],
  },
  {
    id: "hiring_manager",
    label: "Hiring Manager",
    description: "Adds structured hiring workflow in addition to coordination core.",
    requiredSkills: ["paperclip", "paperclip-create-agent"],
  },
];
